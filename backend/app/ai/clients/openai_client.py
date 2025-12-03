"""
OpenAI LLM 客戶端，使用 OpenAI API 進行對話生成。
支援 JSON 輸出模式和錯誤重試。
"""
import json
import logging
from typing import Any, Dict

from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError

logger = logging.getLogger(__name__)


class OpenAiClient:
    """OpenAI API 客戶端，實作 LlmClient Protocol。"""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        self.client = AsyncOpenAI(api_key=api_key, timeout=timeout)
        self.model = model
        self.max_retries = max_retries

    async def complete(self, prompt: str) -> Dict[str, Any]:
        """
        呼叫 OpenAI API 生成對話回應。

        Args:
            prompt: 完整的對話提示詞

        Returns:
            包含 npcText, suggestedPlayerChoices, internalEffects 的字典
        """
        system_message = """You are an NPC dialogue generator for an educational game about preventing bullying.
Always respond in valid JSON format with this structure:
{
    "npcText": "The NPC's dialogue response",
    "suggestedPlayerChoices": ["Choice 1", "Choice 2", "Choice 3"],
    "internalEffects": {
        "playerStatsDelta": {"confidence": 0, "empathy": 0, "stress": 0, "reputation": 0},
        "npcStatsDelta": {"friendship": 0, "trust": 0},
        "questUpdates": []
    }
}

Guidelines:
- Keep dialogue age-appropriate for 11-year-olds
- Encourage seeking help from trusted adults
- Never suggest violence or revenge
- Promote empathy and understanding"""

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7,
                    max_tokens=500,
                )
                content = response.choices[0].message.content
                if content:
                    return json.loads(content)
                else:
                    raise ValueError("Empty response from OpenAI")

            except (RateLimitError, APIConnectionError) as e:
                last_error = e
                logger.warning(f"OpenAI API error (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue

            except APIError as e:
                last_error = e
                logger.error(f"OpenAI API error: {e}")
                break

            except json.JSONDecodeError as e:
                last_error = e
                logger.error(f"Failed to parse OpenAI response as JSON: {e}")
                break

            except Exception as e:
                # 捕捉其他未預期的例外
                last_error = e
                logger.error(f"Unexpected error during OpenAI API call: {e}")
                break

        # 回傳安全預設值
        logger.error(f"All retries failed, returning fallback response. Last error: {last_error}")
        return self._fallback_response()

    def _fallback_response(self) -> Dict[str, Any]:
        """當 API 呼叫失敗時回傳的安全預設回應。"""
        return {
            "npcText": "I'm here to listen. Is there something you'd like to talk about?",
            "suggestedPlayerChoices": [
                "I'd like to talk about something.",
                "Can we chat later?",
                "I need help with something."
            ],
            "internalEffects": {
                "playerStatsDelta": {},
                "npcStatsDelta": {},
                "questUpdates": [],
            },
        }
