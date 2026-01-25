"""Authentication schemas."""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterStudentRequest(BaseModel):
    """Register student request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    student_id: str = Field(..., min_length=3, max_length=50)
    phone_number: str | None = None
    year: str | None = None


class RegisterInstructorRequest(BaseModel):
    """Register instructor request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    staff_id: str = Field(..., min_length=3, max_length=50)
    department: str | None = None
    phone_number: str | None = None


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    role: str
