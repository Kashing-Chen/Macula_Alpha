"""将 LLM 请求轨迹格式化为 Markdown 日志，便于人工查看。"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings

_LOG_LOCK = asyncio.Lock()
_LOG_HEADER = "# LLM 对话日志\n\n> 仅保留最近一次 AI 对话记录，每次新回复会覆盖本文件。\n"


def _log_path() -> Path:
    return settings.storage_dir / "lastLlmRequest.md"


def _format_timestamp(iso_value: Optional[str]) -> str:
    if not iso_value:
        return "—"
    try:
        normalized = iso_value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return iso_value


def _extract_user_message(messages: List[Dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return str(message.get("content", "")).strip()
    return ""


def _json_block(value: Any) -> str:
    if value is None:
        return "（无）"
    try:
        text = json.dumps(value, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        text = str(value)
    return f"```json\n{text}\n```"


def _text_block(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return "（空）"
    return text


def _format_token_usage(metadata: Dict[str, Any]) -> List[str]:
    usage = metadata.get("token_usage") or {}
    if not usage:
        return []

    lines = [
        "| 指标 | 数值 |",
        "| --- | ---: |",
        f"| prompt_tokens | {usage.get('prompt_tokens', '—')} |",
        f"| completion_tokens | {usage.get('completion_tokens', '—')} |",
        f"| total_tokens | {usage.get('total_tokens', '—')} |",
    ]

    prompt_details = usage.get("prompt_tokens_details") or {}
    cached = prompt_details.get("cached_tokens")
    if cached is not None:
        lines.append(f"| cached_tokens | {cached} |")

    cache_hit = usage.get("prompt_cache_hit_tokens")
    cache_miss = usage.get("prompt_cache_miss_tokens")
    if cache_hit is not None:
        lines.append(f"| prompt_cache_hit_tokens | {cache_hit} |")
    if cache_miss is not None:
        lines.append(f"| prompt_cache_miss_tokens | {cache_miss} |")

    model_name = metadata.get("model_name")
    if model_name:
        lines.append("")
        lines.append(f"模型：`{model_name}`")

    return lines


def _aggregate_token_usage(steps: List[Dict[str, Any]]) -> List[str]:
    totals = {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "cached_tokens": 0,
        "prompt_cache_hit_tokens": 0,
        "prompt_cache_miss_tokens": 0,
    }
    has_usage = False

    for step in steps:
        if step.get("type") != "ai":
            continue
        usage = (step.get("response_metadata") or {}).get("token_usage") or {}
        if not usage:
            continue
        has_usage = True
        for key in totals:
            value = usage.get(key)
            if value is None and key == "cached_tokens":
                value = (usage.get("prompt_tokens_details") or {}).get("cached_tokens")
            if isinstance(value, (int, float)):
                totals[key] += int(value)

    if not has_usage:
        return []

    lines = [
        "| 指标 | 合计 |",
        "| --- | ---: |",
        f"| prompt_tokens | {totals['prompt_tokens']} |",
        f"| completion_tokens | {totals['completion_tokens']} |",
        f"| total_tokens | {totals['total_tokens']} |",
    ]
    if totals["cached_tokens"]:
        lines.append(f"| cached_tokens | {totals['cached_tokens']} |")
    if totals["prompt_cache_hit_tokens"]:
        lines.append(f"| prompt_cache_hit_tokens | {totals['prompt_cache_hit_tokens']} |")
    if totals["prompt_cache_miss_tokens"]:
        lines.append(f"| prompt_cache_miss_tokens | {totals['prompt_cache_miss_tokens']} |")
    return lines


def _called_tool_names(steps: List[Dict[str, Any]]) -> List[str]:
    names: List[str] = []
    seen: set[str] = set()
    for step in steps:
        if step.get("type") == "ai":
            for call in step.get("tool_calls") or []:
                name = call.get("name")
                if name and name not in seen:
                    seen.add(name)
                    names.append(name)
        elif step.get("type") == "tool":
            name = step.get("name")
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names


def _format_execution_steps(steps: List[Dict[str, Any]]) -> str:
    if not steps:
        return "（本轮无 Agent 中间步骤）"

    sections: List[str] = []
    pending_calls: Dict[str, Dict[str, Any]] = {}

    for step in steps:
        step_no = step.get("step", "?")
        step_type = step.get("type")

        if step_type == "ai":
            content = _text_block(step.get("content"))
            if content != "（空）":
                sections.append(f"#### 步骤 {step_no} · AI 推理\n\n{content}")

            tool_calls = step.get("tool_calls") or []
            for index, call in enumerate(tool_calls, start=1):
                call_id = call.get("id") or f"call_{step_no}_{index}"
                pending_calls[call_id] = call
                sections.append(
                    "\n".join(
                        [
                            f"#### 步骤 {step_no} · 工具调用 {index}",
                            f"**工具：** `{call.get('name', 'unknown')}`",
                            f"**调用 ID：** `{call_id}`",
                            "**参数：**",
                            _json_block(call.get("args")),
                        ]
                    )
                )

            metadata = step.get("response_metadata") or {}
            token_lines = _format_token_usage(metadata)
            if token_lines:
                sections.append(
                    "\n".join([f"#### 步骤 {step_no} · Token 消耗", "", *token_lines])
                )

        elif step_type == "tool":
            call_id = step.get("tool_call_id") or "—"
            call = pending_calls.get(call_id, {})
            tool_name = step.get("name") or call.get("name") or "unknown"
            sections.append(
                "\n".join(
                    [
                        f"#### 步骤 {step_no} · 工具返回",
                        f"**工具：** `{tool_name}`",
                        f"**调用 ID：** `{call_id}`",
                        "**返回：**",
                        _text_block(step.get("content")),
                    ]
                )
            )

    return "\n\n".join(sections) if sections else "（本轮无 Agent 中间步骤）"


def format_round_markdown(conversation_id: str, payload: Dict[str, Any]) -> str:
    status = payload.get("status", "unknown")
    provider = payload.get("provider", "—")
    requested_at = _format_timestamp(payload.get("requestedAt"))
    completed_at = _format_timestamp(payload.get("completedAt"))

    execution = payload.get("execution") or {}
    input_messages = (execution.get("input") or {}).get("messages") or payload.get("messages") or []
    user_message = _extract_user_message(input_messages)
    response = payload.get("response") or payload.get("error") or "（无回复）"
    steps = execution.get("steps") or []

    meta_lines = [
        f"**对话 ID：** `{conversation_id}`",
        f"**时间：** {requested_at}" + (f" → {completed_at}" if completed_at != "—" else ""),
        f"**Provider：** {provider}",
    ]

    if execution:
        meta_lines.extend(
            [
                f"**Model：** {execution.get('model', '—')}",
                f"**耗时：** {execution.get('durationMs', '—')} ms",
                f"**状态：** {status}",
            ]
        )
    else:
        meta_lines.append(f"**状态：** {status}")

    lines = [
        "---",
        "",
        f"## 轮次 · {requested_at}",
        "",
        *meta_lines,
        "",
        "### 👤 用户",
        "",
        _text_block(user_message),
        "",
    ]

    if status == "error":
        lines.extend(["### ❌ 错误", "", _text_block(payload.get("error")), ""])
    else:
        lines.extend(["### 🤖 AI", "", _text_block(response), ""])

    if execution:
        step_sections = _format_execution_steps(steps)
        lines.extend(["### 🔧 Agent 执行详情", "", step_sections, ""])

        called_tools = _called_tool_names(steps)
        if called_tools:
            tool_names = ", ".join(f"`{name}`" for name in called_tools)
            lines.extend(["### 🛠️ 调用的工具", "", tool_names, ""])

        aggregate_tokens = _aggregate_token_usage(steps)
        if aggregate_tokens:
            lines.extend(["### 📊 Token 合计", "", *aggregate_tokens, ""])

    lines.append("")
    return "\n".join(lines)


async def append_last_llm_request(conversation_id: str, payload: Dict[str, Any]) -> None:
    section = format_round_markdown(conversation_id, payload)
    path = _log_path()

    async with _LOG_LOCK:

        def _write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f"{_LOG_HEADER}\n{section}\n", encoding="utf-8")

        await asyncio.to_thread(_write)
