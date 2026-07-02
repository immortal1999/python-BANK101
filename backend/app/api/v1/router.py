from fastapi import APIRouter

from app.api.v1.endpoints import auth, accounts


# Aggregates all v1 endpoint routers. Included in main.py under API_V1_PREFIX.
api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(accounts.router)
