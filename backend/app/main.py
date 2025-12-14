"""
FastAPI 入口，統一掛載遊戲與 AI 路由。
"""
from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.api import ai, game, config, reset, assets
from app.api import deps
from app.game.services.lore_ingestion_service import LoreIngestionService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    ingestion_service = LoreIngestionService(
        vector_store=deps.get_vector_store_instance(),
        data_dir=deps.get_data_dir()
    )
    ingestion_service.ingest_all()
    yield
    # Shutdown

app = FastAPI(title="Starforge AI Narrative", version="0.1.0", lifespan=lifespan)

app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(game.router, prefix="/game", tags=["game"])
app.include_router(assets.router, prefix="/assets", tags=["assets"])
app.include_router(config.router, tags=["config"])
app.include_router(reset.router, tags=["reset"])


@app.get("/health")
async def health() -> dict:
    """健康檢查，供監控或前端快速確認後端是否運作。"""
    return {"status": "ok"}
