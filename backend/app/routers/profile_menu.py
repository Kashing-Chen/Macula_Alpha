from fastapi import APIRouter

from app.db.json_store import read_collection

router = APIRouter(prefix="/profile-menu", tags=["profile-menu"])


@router.get("")
async def list_profile_menu():
    menu = await read_collection("profileMenu")
    menu.sort(key=lambda item: item.get("order", 0))
    return menu
