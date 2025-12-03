"""
FastAPI 入口，統一掛載遊戲與 AI 路由。
"""
from fastapi import FastAPI

from app.api import ai, game, config, reset

app = FastAPI(title="Starforge AI Narrative", version="0.1.0")

app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(game.router, prefix="/game", tags=["game"])
app.include_router(config.router, tags=["config"])
app.include_router(reset.router, tags=["reset"])


@app.get("/health")
async def health() -> dict:
    """健康檢查，供監控或前端快速確認後端是否運作。"""
    return {"status": "ok"}
