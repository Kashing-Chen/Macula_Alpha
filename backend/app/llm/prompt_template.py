"""提示词模板解析。"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

VARIABLE_RESOLVERS = {
    "个人信息": lambda user: user.get("info") or "",
    "人生战略": lambda user: user.get("lifeStrategy") or "",
    "个人记忆": lambda user: user.get("personalMemory") or "",
}


def resolve_prompt_template(template: Optional[str], user: Dict[str, Any]) -> str:
    if not template or not isinstance(template, str):
        return ""

    def replace(match: Any) -> str:
        key = match.group(1).strip()
        resolver = VARIABLE_RESOLVERS.get(key)
        return resolver(user) if resolver else ""

    import re

    resolved = re.sub(r"\$\{([^}]+)\}", replace, template)
    return resolved.strip()


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
