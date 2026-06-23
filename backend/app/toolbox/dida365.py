"""滴答清单官方 MCP 集成（Streamable HTTP）。

文档：https://help.dida365.com/articles/7438132116019216384
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx
from langchain_mcp_adapters.client import MultiServerMCPClient

from app.config import settings

logger = logging.getLogger(__name__)

_LOAD_ATTEMPTS = 5
_cached_tools: Optional[List] = None
_cache_lock = asyncio.Lock()


def _create_http_client(
    headers: dict[str, str] | None = None,
    timeout: httpx.Timeout | None = None,
    auth: httpx.Auth | None = None,
) -> httpx.AsyncClient:
    """MCP HTTP client that bypasses system proxy (macOS proxy breaks TLS to dida365)."""
    if timeout is None:
        timeout = httpx.Timeout(30.0, read=300.0)
    return httpx.AsyncClient(
        follow_redirects=True,
        timeout=timeout,
        headers=headers,
        auth=auth,
        trust_env=False,
    )


def _connection() -> Optional[Dict[str, Any]]:
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
        "httpx_client_factory": _create_http_client,
    }


async def load_tools() -> List:
    """从滴答清单官方 MCP 服务加载 LangChain 工具。"""
    global _cached_tools

    if _cached_tools is not None:
        return _cached_tools

    connection = _connection()
    if not connection:
        return []

    async with _cache_lock:
        if _cached_tools is not None:
            return _cached_tools

        last_exc: Exception | None = None
        for attempt in range(1, _LOAD_ATTEMPTS + 1):
            try:
                client = MultiServerMCPClient(
                    {"dida365": connection},
                    tool_name_prefix=True,
                )
                tools = await client.get_tools()
                _cached_tools = tools
                logger.info("Loaded %d Dida365 MCP tools", len(tools))
                return tools
            except Exception as exc:
                last_exc = exc
                if attempt < _LOAD_ATTEMPTS:
                    logger.warning(
                        "Dida365 MCP load attempt %d/%d failed: %s",
                        attempt,
                        _LOAD_ATTEMPTS,
                        exc,
                    )
                    await asyncio.sleep(0.5 * attempt)

        if last_exc is not None:
            raise last_exc
        return []
