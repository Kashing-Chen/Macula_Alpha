"""用户资料工具：读取个人信息、人生战略与个人记忆。"""

from __future__ import annotations

from typing import Any, Dict, List

from langchain_core.tools import tool


def build_tools(user: Dict[str, Any]) -> List:
    @tool
    def get_user_profile() -> str:
        """读取用户个人信息、人生战略与个人记忆，用于补充上下文或核对事实。"""
        sections = [
            ("个人信息", user.get("info") or ""),
            ("人生战略", user.get("lifeStrategy") or ""),
            ("个人记忆", user.get("personalMemory") or ""),
        ]
        parts = [f"## {title}\n{content.strip()}" for title, content in sections if content.strip()]
        return "\n\n".join(parts) if parts else "暂无用户资料。"

    return [get_user_profile]
