from fastapi import APIRouter

from app.db.json_store import read_collection, update_collection

router = APIRouter(prefix="/user", tags=["user"])

ALLOWED_FIELDS = {
    "name",
    "bio",
    "info",
    "lifeStrategy",
    "personalMemory",
    "promptTemplate",
    "stats",
    "garden",
    "avatar",
}


@router.get("")
async def get_user():
    return await read_collection("user")


@router.put("")
async def update_user(body: dict):
    patch = {key: body[key] for key in ALLOWED_FIELDS if key in body}

    async def mutator(user: dict) -> dict:
        from datetime import datetime, timezone

        return {
            **user,
            **patch,
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }

    return await update_collection("user", mutator)
