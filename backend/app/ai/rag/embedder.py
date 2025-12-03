"""
Embedding 抽象層，提供 Mock 和 OpenAI Embeddings 實作。
"""
import logging
from typing import List, Protocol

import numpy as np

logger = logging.getLogger(__name__)


class Embedder(Protocol):
    """Embedder 介面，定義文字轉向量的方法。"""

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """
        將文字列表轉換為向量列表。

        Args:
            texts: 要轉換的文字列表

        Returns:
            向量列表，每個向量對應一個輸入文字
        """
        ...


class MockEmbedder:
    """
    Mock Embedder，回傳固定維度的隨機向量。
    用於開發和測試，不需要 API 呼叫。
    """

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        # 使用固定 seed 確保可重現性
        self._rng = np.random.default_rng(42)

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """根據文字內容生成偽隨機向量（相同文字會得到相同向量）。"""
        vectors = []
        for text in texts:
            # 使用文字的 hash 作為 seed，確保相同文字得到相同向量
            text_hash = hash(text) % (2**32)
            rng = np.random.default_rng(text_hash)
            vec = rng.random(self.dimension).tolist()
            # 正規化向量
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = (np.array(vec) / norm).tolist()
            vectors.append(vec)
        return vectors


class OpenAiEmbedder:
    """
    OpenAI Embedder，使用 OpenAI API 生成文字向量。
    """

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        max_retries: int = 3,
    ):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.max_retries = max_retries

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """
        呼叫 OpenAI Embeddings API。

        Args:
            texts: 要轉換的文字列表

        Returns:
            向量列表
        """
        if not texts:
            return []

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=texts,
                )
                # 按照輸入順序回傳向量
                vectors = [item.embedding for item in response.data]
                return vectors

            except Exception as e:
                last_error = e
                logger.warning(
                    f"OpenAI Embeddings API error (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt < self.max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                continue

        logger.error(f"All embedding retries failed. Last error: {last_error}")
        # 回退到 Mock
        mock = MockEmbedder()
        return await mock.embed(texts)


def get_embedder(
    use_mock: bool = True,
    api_key: str | None = None,
    model: str = "text-embedding-3-small",
) -> Embedder:
    """
    工廠函式，根據設定回傳對應的 Embedder。

    Args:
        use_mock: 是否使用 Mock
        api_key: OpenAI API Key
        model: Embedding 模型名稱

    Returns:
        Embedder 實作
    """
    if use_mock or not api_key:
        return MockEmbedder()
    return OpenAiEmbedder(api_key=api_key, model=model)
