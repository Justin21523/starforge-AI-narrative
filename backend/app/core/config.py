"""
Basic configuration reader, using environment variables to control mock and external services.
"""
import os
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider: openai | mock | local
    llm_provider: Literal["openai", "mock", "local"] = "mock"

    # OpenAI settings
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = "gpt-4o-mini"

    # Local model settings
    llm_model_path: str | None = "/mnt/c/ai_models/llm/qwen2-7b-instruct"

    # Embedding settings
    use_mock_vector_store: bool = True
    embedding_model: str = "text-embedding-3-small"
    embed_model_path: str | None = "/mnt/c/ai_models/embeddings/text-embedding-model"

    # Image generation settings
    use_mock_image_client: bool = True
    sd_model_path: str | None = "/mnt/c/ai_models/stable-diffusion/sd1-5"

    # External APIs
    brave_api_key: str | None = None

    # Database settings
    database_url: str = "sqlite+aiosqlite:///./app.db"
    use_in_memory_storage: bool = True

    # Keep old use_mock_llm for backwards compatibility (maps to llm_provider)
    @property
    def use_mock_llm(self) -> bool:
        return self.llm_provider == "mock"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings to avoid repeated environment variable parsing."""
    return Settings()
