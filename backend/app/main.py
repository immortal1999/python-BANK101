from fastapi import FastAPI

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
    """Health check endpoint for App Runner / load balancers."""
    return {"status": "healthy"}


# Routers will be included here as the API grows, e.g.:
# from app.api.v1.router import api_router
# app.include_router(api_router, prefix=settings.API_V1_PREFIX)
