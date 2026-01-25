"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_database_session
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.instructor import Instructor
from app.schemas.auth import (
    LoginRequest,
    RegisterStudentRequest,
    RegisterInstructorRequest,
    TokenResponse,
)

router = APIRouter()


@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_student(
    data: RegisterStudentRequest,
    db: AsyncSession = Depends(get_database_session),
):
    """Register a new student."""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.STUDENT,
    )
    db.add(user)
    await db.flush()
    
    # Create student profile
    student = Student(
        user_id=user.id,
        student_id=data.student_id,
        phone_number=data.phone_number,
        year=data.year,
    )
    db.add(student)
    await db.commit()
    
    # Generate token
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
    )


@router.post("/register/instructor", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_instructor(
    data: RegisterInstructorRequest,
    db: AsyncSession = Depends(get_database_session),
):
    """Register a new instructor."""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.INSTRUCTOR,
    )
    db.add(user)
    await db.flush()
    
    # Create instructor profile
    instructor = Instructor(
        user_id=user.id,
        staff_id=data.staff_id,
        department=data.department,
        phone_number=data.phone_number,
    )
    db.add(instructor)
    await db.commit()
    
    # Generate token
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_database_session),
):
    """Login user."""
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    # Generate token
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
    )
