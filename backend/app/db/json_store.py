"""轻量级 JSON 文件存储层。"""

from __future__ import annotations

import asyncio
import json
import os
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, TypeVar, Union

from app.config import settings

T = TypeVar("T")

_write_locks: dict[str, asyncio.Lock] = {}


def _file_path(collection: str) -> Path:
    return settings.storage_dir / f"{collection}.json"


def _get_lock(collection: str) -> asyncio.Lock:
    if collection not in _write_locks:
        _write_locks[collection] = asyncio.Lock()
    return _write_locks[collection]


async def read_collection(collection: str) -> Any:
    path = _file_path(collection)
    raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
    return json.loads(raw)


async def _write_now(collection: str, data: Any) -> Any:
    target = _file_path(collection)
    tmp = target.with_suffix(f".{os.getpid()}.tmp")
    payload = f"{json.dumps(data, ensure_ascii=False, indent=2)}\n"

    def _write() -> None:
        tmp.write_text(payload, encoding="utf-8")
        tmp.replace(target)

    await asyncio.to_thread(_write)
    return data


async def write_collection(collection: str, data: Any) -> Any:
    async with _get_lock(collection):
        return await _write_now(collection, data)


async def update_collection(
    collection: str,
    mutator: Callable[[Any], Union[Awaitable[Any], Any]],
) -> Any:
    async with _get_lock(collection):
        current = await read_collection(collection)
        result = mutator(current)
        if asyncio.iscoroutine(result):
            result = await result
        to_save = current if result is None else result
        return await _write_now(collection, to_save)
