"""LangChain Agent 工具定义。"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from langchain_core.tools import tool

from app.llm.mcp import load_dida365_mcp_tools

logger = logging.getLogger(__name__)


def build_user_tools(user: Dict[str, Any]) -> List:
    """基于当前用户资料构建 Agent 可用工具。"""

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


async def build_tools(user: Dict[str, Any]) -> List:
    """合并本地工具与滴答清单 MCP 工具。"""
    tools = build_user_tools(user)

    try:
        mcp_tools = await load_dida365_mcp_tools()
        tools.extend(mcp_tools)
    except Exception as exc:
        logger.warning("Dida365 MCP tools unavailable: %s", exc)

    return tools
