"""提示词模板解析：将用户资料变量注入系统提示词。"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

VARIABLE_RESOLVERS = {
    "个人信息": lambda user: user.get("info") or "",
    "人生战略": lambda user: user.get("lifeStrategy") or "",
    "个人记忆": lambda user: user.get("personalMemory") or "",
}


def resolve_prompt_template(template: Optional[str], user: Dict[str, Any]) -> str:
    if not template or not isinstance(template, str):
        return ""

    def replace(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        resolver = VARIABLE_RESOLVERS.get(key)
        return resolver(user) if resolver else ""

    resolved = re.sub(r"\$\{([^}]+)\}", replace, template)
    return resolved.strip()
