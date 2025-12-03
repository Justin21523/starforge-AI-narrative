"""
只讀配置路由，回報目前 mock/模型路徑設定，方便前端或 DevTools 顯示狀態。
"""
from fastapi import APIRouter, Depends
from app.core.config import get_settings, Settings

router = APIRouter()


@router.get("/config")
def config(settings: Settings = Depends(get_settings)):
    return {
        "llmProvider": settings.llm_provider,
        "useMockLlm": settings.use_mock_llm,
        "useMockImageClient": settings.use_mock_image_client,
        "useMockVectorStore": settings.use_mock_vector_store,
        "useInMemoryStorage": settings.use_in_memory_storage,
        "openaiModel": settings.openai_model,
        "embeddingModel": settings.embedding_model,
        "llmModelPath": settings.llm_model_path,
        "embedModelPath": settings.embed_model_path,
        "sdModelPath": settings.sd_model_path,
    }
