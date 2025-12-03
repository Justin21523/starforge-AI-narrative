"""
VectorStore tests.
"""
import pytest
import numpy as np


class TestMockVectorStore:
    """Mock VectorStore (keyword matching) tests."""

    def test_add_and_search(self, mock_vector_store):
        """Test adding and searching documents."""
        results = mock_vector_store.search(terms=["school", "help"], top_k=5)
        assert len(results) > 0
        assert any("school" in r["text"].lower() for r in results)

    def test_search_no_match(self, mock_vector_store):
        """Test no match returns empty list."""
        results = mock_vector_store.search(terms=["xyz123nonexistent"], top_k=5)
        assert len(results) == 0

    def test_search_top_k(self, mock_vector_store):
        """Test top_k limit."""
        results = mock_vector_store.search(terms=["friendship", "school"], top_k=1)
        assert len(results) <= 1

    @pytest.mark.asyncio
    async def test_search_async(self, mock_vector_store):
        """Test async search."""
        results = await mock_vector_store.search_async(query="school bullying", top_k=5)
        assert isinstance(results, list)


class TestEmbeddingVectorStore:
    """Embedding VectorStore tests."""

    @pytest.mark.asyncio
    async def test_embedding_store_with_mock_embedder(self):
        """Test EmbeddingVectorStore with MockEmbedder."""
        from app.ai.rag.embedder import MockEmbedder
        from app.ai.rag.vector_store import EmbeddingVectorStore

        embedder = MockEmbedder(dimension=128)
        store = EmbeddingVectorStore(embedder=embedder)

        # Add documents
        await store.add_async("doc1", "School safety is important", ["safety"])
        await store.add_async("doc2", "Friendship helps mental health", ["friendship"])
        await store.add_async("doc3", "Teachers can provide support", ["support"])

        # Search
        results = await store.search_async(query="school help", top_k=2)
        assert len(results) <= 2
        assert all("_score" in r for r in results)

    @pytest.mark.asyncio
    async def test_embedding_store_build_index(self):
        """Test batch index building."""
        from app.ai.rag.embedder import MockEmbedder
        from app.ai.rag.vector_store import EmbeddingVectorStore

        embedder = MockEmbedder(dimension=64)
        store = EmbeddingVectorStore(embedder=embedder)

        # Sync add (without computing embedding)
        store.add("doc1", "Test document one")
        store.add("doc2", "Test document two")

        # Batch build index
        await store.build_index_async()

        # Verify searchable
        results = await store.search_async(query="test", top_k=2)
        assert len(results) == 2


class TestMockEmbedder:
    """MockEmbedder tests."""

    @pytest.mark.asyncio
    async def test_embed_returns_correct_dimension(self):
        """Test embedding returns correct dimension."""
        from app.ai.rag.embedder import MockEmbedder

        embedder = MockEmbedder(dimension=256)
        vectors = await embedder.embed(["Hello", "World"])

        assert len(vectors) == 2
        assert len(vectors[0]) == 256
        assert len(vectors[1]) == 256

    @pytest.mark.asyncio
    async def test_embed_same_text_same_vector(self):
        """Test same text produces same vector."""
        from app.ai.rag.embedder import MockEmbedder

        embedder = MockEmbedder(dimension=128)
        vectors1 = await embedder.embed(["Hello"])
        vectors2 = await embedder.embed(["Hello"])

        np.testing.assert_array_almost_equal(vectors1[0], vectors2[0])

    @pytest.mark.asyncio
    async def test_embed_normalized(self):
        """Test vectors are normalized."""
        from app.ai.rag.embedder import MockEmbedder

        embedder = MockEmbedder(dimension=64)
        vectors = await embedder.embed(["Test"])

        # Normalized vector L2 norm should be close to 1
        norm = np.linalg.norm(vectors[0])
        assert abs(norm - 1.0) < 0.01
