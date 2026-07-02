from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
)


@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "status": "ok"}


@app.get("/health")
def health():
    """Health check endpoint for load balancers."""
    return {"status": "healthy"}


# All API v1 routes (auth, and future resources) live under /api/v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
