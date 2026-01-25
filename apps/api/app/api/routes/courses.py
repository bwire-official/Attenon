"""Course routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_courses():
    """List all courses."""
    return {"message": "List courses endpoint"}
