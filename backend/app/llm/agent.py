"""LangChain Agent 层：DeepSeek + LangGraph ReAct Agent。"""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any, Dict, List, Optional

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
import httpx
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode, create_react_agent

from app.config import settings
from app.conversation.template import build_system_prompt
from app.toolbox.registry import build_tools

PROVIDER_ALIASES = {
    "deepseek-v4-pro": "deepseek",
    "deepseek-chat": "deepseek",
}


@dataclass
class ChatResult:
    text: str
    trace: Dict[str, Any]


def normalize_provider(name: Optional[str]) -> str:
    raw = (name or settings.llm_provider or "deepseek").strip()
    return PROVIDER_ALIASES.get(raw, raw)


def get_provider(name: Optional[str]) -> str:
    provider = normalize_provider(name)
    if provider != "deepseek":
        raise ValueError(f"Unknown LLM provider: {name}")
    return provider


def list_providers() -> List[str]:
    return ["deepseek"]


def _build_llm() -> ChatOpenAI:
    if not settings.deepseek_api_key:
        raise ValueError("DEEPSEEK_API_KEY is not configured")

    return ChatOpenAI(
        model=settings.deepseek_model,
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        temperature=0.7,
    )


def build_chat_payload(
    provider_name: str,
    messages: List[Dict[str, str]],
) -> Dict[str, Any]:
    provider = get_provider(provider_name)
    if provider != "deepseek":
        raise ValueError(f"Provider {provider_name} does not support build_payload")

    return {
        "model": settings.deepseek_model,
        "messages": messages,
        "stream": False,
    }


def _to_langchain_messages(messages: List[Dict[str, str]]) -> list:
    converted: list = []
    for message in messages:
        role = message.get("role")
        content = message.get("content", "")
        if role == "system":
            converted.append(SystemMessage(content=content))
        elif role == "assistant":
            converted.append(AIMessage(content=content))
        else:
            converted.append(HumanMessage(content=content))
    return converted


def _content_to_str(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                if part.get("type") == "text":
                    parts.append(str(part.get("text", "")))
                else:
                    parts.append(str(part))
        return "".join(parts)
    if content is None:
        return ""
    return str(content)


def _serialize_tool_calls(message: AIMessage) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for call in message.tool_calls or []:
        if isinstance(call, dict):
            serialized.append(
                {
                    "id": call.get("id"),
                    "name": call.get("name"),
                    "args": call.get("args"),
                }
            )
        else:
            serialized.append(
                {
                    "id": getattr(call, "id", None),
                    "name": getattr(call, "name", None),
                    "args": getattr(call, "args", None),
                }
            )
    return serialized


def _serialize_message(message: BaseMessage, step: int) -> Dict[str, Any]:
    if isinstance(message, HumanMessage):
        return {
            "step": step,
            "type": "human",
            "content": _content_to_str(message.content),
        }

    if isinstance(message, SystemMessage):
        return {
            "step": step,
            "type": "system",
            "content": _content_to_str(message.content),
        }

    if isinstance(message, AIMessage):
        payload: Dict[str, Any] = {
            "step": step,
            "type": "ai",
            "content": _content_to_str(message.content),
        }
        tool_calls = _serialize_tool_calls(message)
        if tool_calls:
            payload["tool_calls"] = tool_calls
        if message.response_metadata:
            payload["response_metadata"] = message.response_metadata
        return payload

    if isinstance(message, ToolMessage):
        return {
            "step": step,
            "type": "tool",
            "name": message.name,
            "tool_call_id": message.tool_call_id,
            "content": _content_to_str(message.content),
            "status": getattr(message, "status", None),
        }

    return {
        "step": step,
        "type": message.__class__.__name__,
        "content": _content_to_str(getattr(message, "content", "")),
    }


def _with_system_message(
    messages: List[Dict[str, str]],
    system_content: str,
) -> List[Dict[str, str]]:
    if not system_content:
        return messages
    without_system = [message for message in messages if message.get("role") != "system"]
    return [{"role": "system", "content": system_content}, *without_system]


def _build_execution_trace(
    *,
    provider_name: str,
    input_messages: List[Dict[str, str]],
    agent_input_messages: List[BaseMessage],
    agent_result: Dict[str, Any],
    tools: List,
    duration_ms: int,
) -> Dict[str, Any]:
    output_messages: List[BaseMessage] = list(agent_result.get("messages") or [])
    new_messages = output_messages[len(agent_input_messages) :]

    return {
        "framework": "langgraph",
        "agent": "create_react_agent",
        "provider": provider_name,
        "model": settings.deepseek_model,
        "durationMs": duration_ms,
        "tools": [getattr(tool, "name", str(tool)) for tool in tools],
        "input": {
            "messageCount": len(input_messages),
            "messages": input_messages,
        },
        "steps": [_serialize_message(message, index + 1) for index, message in enumerate(new_messages)],
        "stepCount": len(new_messages),
    }


def _root_exception(exc: BaseException) -> BaseException:
    current = exc
    while isinstance(current, BaseExceptionGroup) and current.exceptions:
        current = current.exceptions[0]
    return current


def format_agent_error(exc: BaseException) -> str:
    """将 Agent / 工具链异常转为可读错误信息。"""
    root = _root_exception(exc)
    if isinstance(root, httpx.ConnectTimeout):
        return "滴答清单服务连接超时，请检查网络后重试"
    if isinstance(root, httpx.TimeoutException):
        return "滴答清单服务响应超时，请稍后重试"
    if isinstance(root, httpx.HTTPError):
        return f"滴答清单服务请求失败：{root}"
    message = str(exc).strip()
    return message or "LLM request failed"


def _format_tool_error(exc: Exception) -> str:
    """工具失败时返回给模型的错误内容，避免整轮对话崩溃。"""
    return f"Error: {format_agent_error(exc)}"


def _extract_response_text(result: Dict[str, Any]) -> str:
    output_messages = result.get("messages") or []
    for message in reversed(output_messages):
        if isinstance(message, AIMessage):
            content = message.content
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                text_parts = [
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ]
                joined = "".join(text_parts).strip()
                if joined:
                    return joined
    raise ValueError("Agent returned an empty response")


async def chat(
    provider_name: str,
    messages: List[Dict[str, str]],
    user: Dict[str, Any],
) -> ChatResult:
    get_provider(provider_name)

    system_content = ""
    conversation_messages: List[Dict[str, str]] = []
    for message in messages:
        if message.get("role") == "system":
            system_content = message.get("content", "")
        else:
            conversation_messages.append(message)

    if not system_content:
        system_content = build_system_prompt(user)

    llm = _build_llm()
    tools = await build_tools(user)
    tool_node = ToolNode(tools, handle_tool_errors=_format_tool_error)
    agent = create_react_agent(
        model=llm,
        tools=tool_node,
        prompt=system_content or "你是 Macula，用户的私人 AI 幕僚长。",
    )

    lc_messages = _to_langchain_messages(conversation_messages)
    started = perf_counter()
    result = await agent.ainvoke({"messages": lc_messages})
    duration_ms = int((perf_counter() - started) * 1000)

    trace = _build_execution_trace(
        provider_name=provider_name,
        input_messages=_with_system_message(messages, system_content),
        agent_input_messages=lc_messages,
        agent_result=result,
        tools=tools,
        duration_ms=duration_ms,
    )

    return ChatResult(text=_extract_response_text(result), trace=trace)
