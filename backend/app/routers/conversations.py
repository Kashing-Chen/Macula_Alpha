from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Response

from app.config import settings
from app.db.json_store import read_collection, update_collection, write_collection
from app.llm.agent import build_chat_payload, chat
from app.llm.request_log import append_last_llm_request
from app.conversation.messages import build_llm_messages

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _format_list_time(when: Optional[datetime] = None) -> str:
    current = when or datetime.now()
    return current.strftime("%H:%M")


def _preview_text(text: str, max_len: int = 60) -> str:
    trimmed = " ".join(text.split()).strip()
    if len(trimmed) <= max_len:
        return trimmed
    return f"{trimmed[:max_len]}…"


def _is_ai_conversation(conversation: Optional[Dict[str, Any]]) -> bool:
    return conversation is not None and conversation.get("type") == "ai"


async def _update_conversation_meta(conversation_id: str, preview: str) -> None:
    now = datetime.now()

    async def mutator(conversations: list[dict]) -> list[dict]:
        for conversation in conversations:
            if conversation.get("id") == conversation_id:
                conversation["preview"] = _preview_text(preview)
                conversation["time"] = _format_list_time(now)
                break
        return conversations

    await update_collection("conversations", mutator)


async def _save_last_llm_request(conversation_id: str, payload: dict) -> None:
    await append_last_llm_request(conversation_id, payload)


@router.get("")
async def list_conversations():
    conversations = await read_collection("conversations")
    conversations.sort(key=lambda item: item.get("order", 0))
    return conversations


@router.post("", status_code=201)
async def create_conversation(body: Optional[Dict[str, Any]] = None):
    body = body or {}
    conversation_id = f"conv_{int(datetime.now().timestamp() * 1000)}"
    provider = body.get("provider") or settings.llm_provider

    conversation = {
        "id": conversation_id,
        "title": "新对话",
        "type": "ai",
        "provider": provider,
        "time": "刚刚",
        "preview": "",
        "order": 0,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    async def update_conversations(conversations: list[dict]) -> list[dict]:
        min_order = min((item.get("order", 0) for item in conversations), default=0)
        conversation["order"] = min_order - 1
        conversations.append(conversation)
        return conversations

    await update_collection("conversations", update_conversations)

    async def init_messages(messages: dict) -> dict:
        messages[conversation_id] = []
        return messages

    await update_collection("messages", init_messages)
    return conversation


@router.post("/batch-delete", status_code=204)
async def delete_conversations(body: dict):
    ids = body.get("ids")
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids array is required")

    id_set = {item for item in ids if isinstance(item, str) and item}

    async def remove_conversations(conversations: list[dict]) -> list[dict]:
        return [item for item in conversations if item.get("id") not in id_set]

    await update_collection("conversations", remove_conversations)

    async def remove_messages(messages: dict) -> dict:
        for conversation_id in id_set:
            messages.pop(conversation_id, None)
        return messages

    await update_collection("messages", remove_messages)
    return Response(status_code=204)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    conversations = await read_collection("conversations")
    if not any(item.get("id") == conversation_id for item in conversations):
        raise HTTPException(status_code=404, detail="Conversation not found")

    async def remove_conversation(items: list[dict]) -> list[dict]:
        return [item for item in items if item.get("id") != conversation_id]

    await update_collection("conversations", remove_conversation)

    async def remove_messages(messages: dict) -> dict:
        messages.pop(conversation_id, None)
        return messages

    await update_collection("messages", remove_messages)
    return Response(status_code=204)


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    conversations = await read_collection("conversations")
    conversation = next((item for item in conversations if item.get("id") == conversation_id), None)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/{conversation_id}/messages")
async def list_messages(conversation_id: str):
    conversations = await read_collection("conversations")
    conversation = next((item for item in conversations if item.get("id") == conversation_id), None)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await read_collection("messages")

    if conversation_id in messages:
        return messages[conversation_id]

    if _is_ai_conversation(conversation):
        return []

    return messages.get("_default", [])


@router.post("/{conversation_id}/messages", status_code=201)
async def create_message(conversation_id: str, body: dict):
    text = body.get("text")
    sender = body.get("sender", "me")

    if not text or not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="Message text is required")

    conversations = await read_collection("conversations")
    conversation = next((item for item in conversations if item.get("id") == conversation_id), None)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = {
        "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
        "sender": "other" if sender == "other" else "me",
        "text": text.strip(),
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    thread: list[dict] = []

    async def append_user_message(messages: dict) -> dict:
        nonlocal thread
        thread = list(messages.get(conversation_id, []))
        thread.append(user_message)
        messages[conversation_id] = thread
        return messages

    await update_collection("messages", append_user_message)
    await _update_conversation_meta(conversation_id, user_message["text"])

    if not _is_ai_conversation(conversation) or user_message["sender"] != "me":
        return {"user": user_message}

    provider = conversation.get("provider") or settings.llm_provider
    user = await read_collection("user")
    llm_messages = build_llm_messages(thread, user)
    requested_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    try:
        chat_result = await chat(provider, llm_messages, user)
    except ValueError as exc:
        await _save_last_llm_request(
            conversation_id,
            {
                "provider": provider,
                **build_chat_payload(provider, llm_messages),
                "requestedAt": requested_at,
                "status": "error",
                "error": str(exc),
            },
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        await _save_last_llm_request(
            conversation_id,
            {
                "provider": provider,
                **build_chat_payload(provider, llm_messages),
                "requestedAt": requested_at,
                "status": "error",
                "error": str(exc) or "LLM request failed",
            },
        )
        raise HTTPException(status_code=502, detail=str(exc) or "LLM request failed") from exc

    assistant_text = chat_result.text
    completed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    await _save_last_llm_request(
        conversation_id,
        {
            "provider": provider,
            "requestedAt": requested_at,
            "completedAt": completed_at,
            "status": "ok",
            "response": assistant_text,
            "execution": chat_result.trace,
        },
    )

    assistant_message = {
        "id": f"msg_{int(datetime.now().timestamp() * 1000) + 1}",
        "sender": "other",
        "text": assistant_text,
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    async def append_assistant_message(messages: dict) -> dict:
        current = list(messages.get(conversation_id, []))
        current.append(assistant_message)
        messages[conversation_id] = current
        return messages

    await update_collection("messages", append_assistant_message)
    await _update_conversation_meta(conversation_id, assistant_message["text"])

    return {"user": user_message, "assistant": assistant_message}
