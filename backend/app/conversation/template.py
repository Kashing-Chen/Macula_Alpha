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


def build_system_prompt(user: Dict[str, Any]) -> str:
    template = user.get("promptTemplate")
    template_text = template if isinstance(template, str) else ""
    resolved = resolve_prompt_template(template_text or None, user)

    info = (user.get("info") or "").strip()
    if info and "${个人信息}" not in template_text:
        info_block = f"## 用户信息\n\n{info}"
        resolved = f"{resolved}\n\n{info_block}" if resolved else info_block

    return resolved.strip()
