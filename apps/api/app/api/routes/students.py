"""Student routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_database_session
from app.core.security import get_current_user
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentResponse

router = APIRouter()


@router.get("/", response_model=List[StudentResponse])
async def list_students(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_database_session),
):
    """List all students."""
    # Only instructors can list students
    if current_user.get("role") != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can access this endpoint",
        )
    
    result = await db.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .offset(skip)
        .limit(limit)
    )
    students = result.all()
    
    return [
        StudentResponse(
            id=student.id,
            user_id=student.user_id,
            full_name=user.full_name,
            email=user.email,
            student_id=student.student_id,
            phone_number=student.phone_number,
            year=student.year,
            is_active=user.is_active,
            created_at=student.created_at,
            updated_at=student.updated_at,
        )
        for student, user in students
    ]


@router.get("/me", response_model=StudentResponse)
async def get_current_student(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_database_session),
):
    """Get current student profile."""
    user_id = int(current_user.get("sub"))
    
    result = await db.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.user_id == user_id)
    )
    data = result.one_or_none()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )
    
    student, user = data
    
    return StudentResponse(
        id=student.id,
        user_id=student.user_id,
        full_name=user.full_name,
        email=user.email,
        student_id=student.student_id,
        phone_number=student.phone_number,
        year=student.year,
        is_active=user.is_active,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )
