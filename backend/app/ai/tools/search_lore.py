"""
搜尋世界觀／玩家客製資料的工具，使用 in-memory VectorStore（無 embedding）。
"""
from typing import Any, Dict, List

from app.ai.rag.vector_store import VectorStore


class SearchLoreTool:
    name = "search_lore"
    description = "Search lore and persona memory for the given terms."

    def __init__(self, store: VectorStore):
        self.store = store

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        terms: List[str] = tool_input.get("terms", [])
        hits = self.store.search(terms=terms, top_k=5)
        # 若找不到，仍回傳一筆安全提示
        if not hits:
            hits = [
                {
                    "id": "safety-default",
                    "text": "If bullying occurs, talk to a trusted adult or teacher and stay with friends.",
                    "tags": ["safety", "bullying"],
                }
            ]
        return {"hits": hits, "terms": terms}
