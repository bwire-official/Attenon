"""Instructor routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_instructors():
    """List all instructors."""
    return {"message": "List instructors endpoint"}
