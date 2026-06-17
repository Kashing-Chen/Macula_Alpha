from fastapi import APIRouter

from app.db.json_store import read_collection

router = APIRouter(prefix="/stories", tags=["stories"])


@router.get("")
async def list_stories():
    stories = await read_collection("stories")
    stories.sort(key=lambda item: item.get("order", 0))
    return stories
