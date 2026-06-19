"""对话参数格式化：UI 消息线程 → LLM 消息列表。"""

from __future__ import annotations

from typing import Any, Dict, List

from app.conversation.template import resolve_prompt_template


def to_llm_messages(thread: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    return [
        {
            "role": "user" if message.get("sender") == "me" else "assistant",
            "content": message.get("text", ""),
        }
        for message in thread
    ]


def build_llm_messages(
    thread: List[Dict[str, Any]],
    user: Dict[str, Any],
) -> List[Dict[str, str]]:
    history = to_llm_messages(thread)
    system_content = resolve_prompt_template(user.get("promptTemplate"), user)
    if not system_content:
        return history
    return [{"role": "system", "content": system_content}, *history]
