"""
LLM Client module.

Provides factory function to select appropriate LLM client based on settings.
"""
from typing import TYPE_CHECKING

from app.ai.clients.llm_client import LlmClient

if TYPE_CHECKING:
    from app.core.config import Settings


def get_llm_client(settings: "Settings") -> LlmClient:
    """
    Get LLM client based on settings.

    Args:
        settings: Application settings

    Returns:
        LlmClient implementation (OpenAiClient, LocalLlmClient, or LlmClientMock)

    Raises:
        ValueError: When llm_provider is 'openai' but no API key is provided
    """
    match settings.llm_provider:
        case "openai":
            if not settings.openai_api_key:
                raise ValueError(
                    "OPENAI_API_KEY is required when llm_provider is 'openai'. "
                    "Please set it in your environment or .env file."
                )
            from app.ai.clients.openai_client import OpenAiClient
            return OpenAiClient(
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )

        case "local":
            from app.ai.clients.local_llm_client import LocalLlmClient
            model_path = settings.llm_model_path or "./models/qwen2-7b-instruct"
            return LocalLlmClient(model_path=model_path)

        case "mock" | _:
            from app.ai.mocks.llm_client_mock import LlmClientMock
            return LlmClientMock()


__all__ = ["LlmClient", "get_llm_client"]
