"""滴答清单官方 MCP 集成（Streamable HTTP）。

文档：https://help.dida365.com/articles/7438132116019216384
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from langchain_mcp_adapters.client import MultiServerMCPClient

from app.config import settings

logger = logging.getLogger(__name__)


def _dida365_connection() -> Optional[Dict[str, Any]]:
    if not settings.dida365_mcp_enabled:
        return None

    token = settings.dida365_mcp_token.strip()
    if not token:
        return None

    return {
        "transport": "http",
        "url": settings.dida365_mcp_url,
        "headers": {
            "Authorization": f"Bearer {token}",
        },
    }


async def load_dida365_mcp_tools() -> List:
    """从滴答清单官方 MCP 服务加载 LangChain 工具。"""
    connection = _dida365_connection()
    if not connection:
        return []

    client = MultiServerMCPClient(
        {"dida365": connection},
        tool_name_prefix=True,
    )
    tools = await client.get_tools()
    logger.info("Loaded %d Dida365 MCP tools", len(tools))
    return tools
