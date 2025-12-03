"""
Brave Web Search 工具 stub，為唯一允許的外部 API。預設回傳假資料，若未安裝 httpx 或無金鑰則使用 mock。
"""
from typing import Any, Dict, List, Optional
import os


class WebSearchTool:
    name = "web_search"
    description = "Search the web (Brave) for safety/contextual information."

    def __init__(self, brave_api_key: Optional[str] = None) -> None:
        self.brave_api_key = brave_api_key or os.getenv("BRAVE_API_KEY")

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        query_terms: List[str] = tool_input.get("terms", [])
        query = " ".join(query_terms) or "school safety bullying advice"

        if not self.brave_api_key:
            # 測試/開發時回傳固定假資料，避免對外呼叫
            return {
                "query": query,
                "hits": [
                    {
                        "title": "Safe response to bullying",
                        "url": "https://example.com/safety",
                        "snippet": "Tell a trusted adult, keep notes, stay with friends.",
                    }
                ],
                "mock": True,
            }

        try:
            import httpx  # type: ignore
        except ImportError:
            return {
                "query": query,
                "hits": [],
                "mock": True,
                "note": "httpx not installed; returning empty results.",
            }

        # 真實呼叫 Brave Search
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 3},
                headers={"X-Subscription-Token": self.brave_api_key},
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            web_hits = data.get("web", {}).get("results", [])
            hits = [
                {
                    "title": h.get("title"),
                    "url": h.get("url"),
                    "snippet": h.get("description"),
                }
                for h in web_hits
            ]
            return {"query": query, "hits": hits, "mock": False}
