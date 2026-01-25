# Attenon API

FastAPI backend for the Attenon attendance management system.

## Features

- FastAPI framework with async support
- PostgreSQL database with SQLAlchemy ORM
- JWT authentication
- Role-based access control (Student, Instructor)
- RESTful API design
- Automatic API documentation (Swagger/OpenAPI)
- Database migrations with Alembic
- Redis for caching (optional)

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (optional)

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Start the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
app/
├── api/
│   ├── routes/           # API endpoints
│   ├── dependencies/     # Dependency injection
│   └── middleware/       # Custom middleware
├── core/
│   ├── config.py        # Configuration
│   ├── security.py      # Authentication/Authorization
│   └── database.py      # Database setup
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # Business logic
├── repositories/        # Database operations
└── main.py             # Application entry point
```

## Testing

```bash
pytest
```

## Code Quality

Format code:
```bash
black app/
```

Lint code:
```bash
flake8 app/
```

Type checking:
```bash
mypy app/
```
