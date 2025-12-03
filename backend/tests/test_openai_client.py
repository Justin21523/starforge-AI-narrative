"""
OpenAI Client 測試。
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestOpenAiClient:
    """OpenAI Client 測試類別。"""

    @pytest.mark.asyncio
    async def test_complete_success(self):
        """測試成功的 API 呼叫。"""
        from app.ai.clients.openai_client import OpenAiClient

        # Mock OpenAI 回應
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"npcText": "Hello!", "suggestedPlayerChoices": ["Hi!", "Bye!"], "internalEffects": {}}'
                )
            )
        ]

        with patch("app.ai.clients.openai_client.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_openai.return_value = mock_client

            client = OpenAiClient(api_key="test_key", model="gpt-4o-mini")
            result = await client.complete("Test prompt")

            assert result["npcText"] == "Hello!"
            assert "suggestedPlayerChoices" in result

    @pytest.mark.asyncio
    async def test_complete_fallback_on_error(self):
        """測試 API 錯誤時回退到安全預設。"""
        from app.ai.clients.openai_client import OpenAiClient

        with patch("app.ai.clients.openai_client.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(
                side_effect=Exception("Test API error")
            )
            mock_openai.return_value = mock_client

            client = OpenAiClient(api_key="test_key", max_retries=1)
            result = await client.complete("Test prompt")

            # 應該回傳安全預設值
            assert "npcText" in result
            assert "suggestedPlayerChoices" in result

    def test_fallback_response(self):
        """測試安全預設回應結構。"""
        from app.ai.clients.openai_client import OpenAiClient

        with patch("app.ai.clients.openai_client.AsyncOpenAI"):
            client = OpenAiClient(api_key="test_key")
            fallback = client._fallback_response()

            assert "npcText" in fallback
            assert "suggestedPlayerChoices" in fallback
            assert isinstance(fallback["suggestedPlayerChoices"], list)
            assert "internalEffects" in fallback
