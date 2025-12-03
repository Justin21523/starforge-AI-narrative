"""
提供假的 LLM 回應，方便在開發與測試階段不依賴外部服務。
"""
from typing import Any, Dict
from datetime import datetime


class LlmClientMock:
    async def complete(self, prompt: str) -> Dict[str, Any]:
        # 簡單示例：回應帶入時間戳與提示文字，實際可依測試案例調整。
        now = datetime.utcnow().isoformat()
        return {
            "npcText": "Mock: Thanks for sharing. How are you feeling today?",
            "suggestedPlayerChoices": [
                "I'm doing okay.",
                "I'm a bit stressed.",
                "Can we talk later?"
            ],
            "internalEffects": {
                "playerStatsDelta": {"confidence": 1},
                "npcStatsDelta": {"friendship": 1},
                "questUpdates": []
            },
            "meta": {"generatedAt": now, "promptEcho": prompt[:120]},
        }
