"""
LLM 客戶端介面，方便在測試與正式實作間切換。
"""
from typing import Protocol, Any, Dict


class LlmClient(Protocol):
    async def complete(self, prompt: str) -> Dict[str, Any]:
        ...
