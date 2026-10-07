from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import CityMindHTTPException


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Log environment and initialization info
    yield
    # Shutdown: Clean up connections if necessary


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="CityMind AI — AI-Powered Urban Management and Decision-Support Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Configuration
if settings.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Exception Handlers
@app.exception_handler(CityMindHTTPException)
async def citymind_exception_handler(request: Request, exc: CityMindHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        content = {
            "detail": exc.detail,
            "success": exc.detail.get("success", False),
            "code": exc.detail.get("code", "ERROR"),
            "message": exc.detail.get("message", ""),
        }
    else:
        content = {
            "detail": {"message": str(exc.detail)},
            "success": False,
            "message": str(exc.detail),
        }
    return JSONResponse(status_code=exc.status_code, content=content)


# Include API v1 Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root metadata endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": f"{settings.API_V1_STR}/health",
    }
