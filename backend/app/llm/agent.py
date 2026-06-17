"""LangChain Agent 层：DeepSeek + LangGraph ReAct Agent。"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.config import settings
from app.llm.prompt_template import resolve_prompt_template
from app.llm.tools import build_tools

PROVIDER_ALIASES = {
    "deepseek-v4-pro": "deepseek",
    "deepseek-chat": "deepseek",
}


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
) -> str:
    get_provider(provider_name)

    system_content = ""
    conversation_messages: List[Dict[str, str]] = []
    for message in messages:
        if message.get("role") == "system":
            system_content = message.get("content", "")
        else:
            conversation_messages.append(message)

    if not system_content:
        system_content = resolve_prompt_template(user.get("promptTemplate"), user)

    llm = _build_llm()
    tools = await build_tools(user)
    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=system_content or "你是 Macula，用户的私人 AI 幕僚长。",
    )

    lc_messages = _to_langchain_messages(conversation_messages)
    result = await agent.ainvoke({"messages": lc_messages})
    return _extract_response_text(result)
