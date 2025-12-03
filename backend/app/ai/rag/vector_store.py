"""
VectorStore 模組，提供 Mock（關鍵詞匹配）和 Embedding（向量相似度）兩種實作。
"""
from typing import List, Dict, Any, Protocol, TYPE_CHECKING
import logging

import numpy as np

if TYPE_CHECKING:
    from app.ai.rag.embedder import Embedder

logger = logging.getLogger(__name__)


class VectorStoreProtocol(Protocol):
    """VectorStore 介面。"""

    def add(self, doc_id: str, text: str, tags: List[str] | None = None) -> None:
        ...

    def search(self, terms: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        ...

    async def search_async(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        ...


class VectorStore:
    """
    Mock VectorStore，使用關鍵詞匹配。
    用於開發和測試，不需要 embedding 模型。
    """

    def __init__(self):
        # docs: List[{"id": str, "text": str, "tags": List[str]}]
        self.docs: List[Dict[str, Any]] = []

    def add(self, doc_id: str, text: str, tags: List[str] | None = None) -> None:
        self.docs.append({"id": doc_id, "text": text, "tags": tags or []})

    def search(self, terms: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """簡易匹配：包含任一 term 即視為命中。"""
        results = []
        lowered_terms = [t.lower() for t in terms if t]
        for doc in self.docs:
            text = doc["text"].lower()
            if any(term in text for term in lowered_terms):
                results.append(doc)
        return results[:top_k]

    async def search_async(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """非同步搜尋（Mock 版本直接呼叫同步方法）。"""
        terms = query.split()
        return self.search(terms, top_k)


class EmbeddingVectorStore:
    """
    基於向量 embedding 的 VectorStore。
    使用 cosine similarity 進行相似度搜尋。
    """

    def __init__(self, embedder: "Embedder"):
        self.embedder = embedder
        self.docs: List[Dict[str, Any]] = []
        self.vectors: List[List[float]] = []

    async def add_async(self, doc_id: str, text: str, tags: List[str] | None = None) -> None:
        """非同步添加文檔並計算 embedding。"""
        embeddings = await self.embedder.embed([text])
        if embeddings:
            self.docs.append({"id": doc_id, "text": text, "tags": tags or []})
            self.vectors.append(embeddings[0])

    def add(self, doc_id: str, text: str, tags: List[str] | None = None) -> None:
        """
        同步添加文檔（不計算 embedding，需要之後批次處理）。
        注意：使用此方法添加的文檔需要呼叫 build_index_async 才能被搜尋到。
        """
        self.docs.append({
            "id": doc_id,
            "text": text,
            "tags": tags or [],
            "_needs_embedding": True
        })

    async def build_index_async(self) -> None:
        """批次計算所有尚未處理的文檔的 embedding。"""
        docs_to_embed = [
            (i, doc) for i, doc in enumerate(self.docs)
            if doc.get("_needs_embedding", False)
        ]
        if not docs_to_embed:
            return

        texts = [doc["text"] for _, doc in docs_to_embed]
        embeddings = await self.embedder.embed(texts)

        # 確保 vectors 列表長度與 docs 相同
        while len(self.vectors) < len(self.docs):
            self.vectors.append([])

        for (idx, doc), embedding in zip(docs_to_embed, embeddings):
            self.vectors[idx] = embedding
            doc.pop("_needs_embedding", None)

    def search(self, terms: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """同步搜尋（回退到關鍵詞匹配）。"""
        results = []
        lowered_terms = [t.lower() for t in terms if t]
        for doc in self.docs:
            text = doc["text"].lower()
            if any(term in text for term in lowered_terms):
                results.append(doc)
        return results[:top_k]

    async def search_async(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        非同步向量搜尋。

        Args:
            query: 搜尋查詢
            top_k: 回傳前 k 個最相似的結果

        Returns:
            最相似的文檔列表，包含相似度分數
        """
        if not self.docs or not self.vectors:
            return []

        # 計算查詢向量
        query_embeddings = await self.embedder.embed([query])
        if not query_embeddings:
            return self.search(query.split(), top_k)

        query_vec = np.array(query_embeddings[0])

        # 計算 cosine similarity
        similarities = []
        for i, vec in enumerate(self.vectors):
            if not vec:  # 跳過尚未計算 embedding 的文檔
                continue
            doc_vec = np.array(vec)
            # Cosine similarity = dot(a, b) / (norm(a) * norm(b))
            dot_product = np.dot(query_vec, doc_vec)
            norm_product = np.linalg.norm(query_vec) * np.linalg.norm(doc_vec)
            if norm_product > 0:
                similarity = dot_product / norm_product
            else:
                similarity = 0.0
            similarities.append((i, similarity))

        # 按相似度排序
        similarities.sort(key=lambda x: x[1], reverse=True)

        # 回傳 top_k 結果
        results = []
        for idx, score in similarities[:top_k]:
            doc = self.docs[idx].copy()
            doc["_score"] = float(score)
            results.append(doc)

        return results


def get_vector_store(
    use_mock: bool = True,
    embedder: "Embedder | None" = None,
) -> VectorStoreProtocol:
    """
    工廠函式，根據設定回傳對應的 VectorStore。

    Args:
        use_mock: 是否使用 Mock（關鍵詞匹配）
        embedder: Embedder 實作（use_mock=False 時需要）

    Returns:
        VectorStore 實作
    """
    if use_mock or embedder is None:
        return VectorStore()
    return EmbeddingVectorStore(embedder=embedder)
