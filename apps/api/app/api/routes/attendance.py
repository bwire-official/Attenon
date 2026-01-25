"""Attendance routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_attendance():
    """List attendance records."""
    return {"message": "List attendance endpoint"}
