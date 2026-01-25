"""Student schemas."""
from datetime import datetime
from pydantic import BaseModel, EmailStr


class StudentBase(BaseModel):
    """Base student schema."""
    full_name: str
    email: EmailStr
    student_id: str
    phone_number: str | None = None
    year: str | None = None


class StudentCreate(StudentBase):
    """Create student schema."""
    pass


class StudentUpdate(BaseModel):
    """Update student schema."""
    full_name: str | None = None
    phone_number: str | None = None
    year: str | None = None


class StudentResponse(StudentBase):
    """Student response schema."""
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
