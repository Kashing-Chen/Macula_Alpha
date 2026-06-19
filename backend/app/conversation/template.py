"""提示词模板解析：将用户资料变量注入系统提示词。"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, Optional

_WEEKDAYS = ("星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日")
_TOOL_TIMEZONE_NOTE = (
    "滴答清单工具返回的时间字段（如 startDate、dueDate、completedTime）以 UTC（+0000）标注，"
    "不是北京时间。换算北京时间需在该时刻上加 8 小时。"
    "返回的时间不需要特意标注北京时间，只需要换算后告知用户即可。"
)


def _format_current_time() -> str:
    now = datetime.now()
    weekday = _WEEKDAYS[now.weekday()]
    return now.strftime(f"%Y年%m月%d日 {weekday} %H:%M")


VARIABLE_RESOLVERS = {
    "个人信息": lambda user: user.get("info") or "",
    "人生战略": lambda user: user.get("lifeStrategy") or "",
    "个人记忆": lambda user: user.get("personalMemory") or "",
    "当下时间": lambda _user: _format_current_time(),
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

    prefix_parts: list[str] = []
    if "${当下时间}" not in template_text:
        prefix_parts.append(f"## 当下时间\n\n{_format_current_time()}")
    prefix_parts.append(_TOOL_TIMEZONE_NOTE)
    prefix = "\n\n".join(prefix_parts)
    resolved = f"{prefix}\n\n{resolved}" if resolved else prefix

    return resolved.strip()
