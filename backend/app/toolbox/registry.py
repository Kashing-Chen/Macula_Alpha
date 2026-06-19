"""工具箱注册表：按模块聚合 Agent 可用工具。"""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict, List, Tuple

from app.toolbox import dida365, email, user_profile

logger = logging.getLogger(__name__)

ToolLoader = Callable[[], Awaitable[List]]

# 新增 MCP 或外部工具时，在此注册对应模块的 load_tools。
MCP_TOOL_LOADERS: Tuple[Tuple[str, ToolLoader], ...] = (
    ("dida365", dida365.load_tools),
    ("email", email.load_tools),
)


async def build_tools(user: Dict[str, Any]) -> List:
    """合并本地工具与各 MCP 模块工具。"""
    tools = user_profile.build_tools(user)

    for module_name, loader in MCP_TOOL_LOADERS:
        try:
            tools.extend(await loader())
        except Exception as exc:
            logger.warning("%s tools unavailable: %s", module_name, exc)

    return tools
