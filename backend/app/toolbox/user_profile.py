"""用户资料工具：读取个人信息、人生战略与个人记忆。"""

from __future__ import annotations

from typing import Any, Dict, List

from langchain_core.tools import tool


def build_tools(user: Dict[str, Any]) -> List:
    @tool
    def get_user_profile() -> str:
        """读取用户人生战略与个人记忆。个人信息已在系统提示词中，无需重复查询。"""
        sections = [
            ("人生战略", user.get("lifeStrategy") or ""),
            ("个人记忆", user.get("personalMemory") or ""),
        ]
        parts = [f"## {title}\n{content.strip()}" for title, content in sections if content.strip()]
        return "\n\n".join(parts) if parts else "暂无人生战略或个人记忆。"

    return [get_user_profile]
