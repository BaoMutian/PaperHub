from sentence_transformers import SentenceTransformer
from typing import List, Optional
import logging
import numpy as np

from ..config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.settings = get_settings()
        self._model: Optional[SentenceTransformer] = None

    def _load_model(self):
        """Lazy load the embedding model"""
        if self._model is None:
            logger.info(
                f"Loading embedding model: {self.settings.embedding_model}")
            # trust_remote_code=True 用于 Qwen 等需要自定义代码的模型
            self._model = SentenceTransformer(
                self.settings.embedding_model,
                trust_remote_code=True
            )
            logger.info("Embedding model loaded successfully")

    def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        """Generate embedding for a single text
        
        Args:
            text: The text to embed
            is_query: If True, use query prompt for better retrieval (Qwen3-Embedding specific)
        """
        self._load_model()
        # Qwen3-Embedding 对查询使用 prompt 可提升 1-5% 效果
        if is_query and hasattr(self._model, 'prompts') and 'query' in self._model.prompts:
            embedding = self._model.encode(text, prompt_name="query", convert_to_numpy=True)
        else:
            embedding = self._model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a search query (with query prompt)"""
        return self.embed_text(text, is_query=True)
    
    def embed_document(self, text: str) -> List[float]:
        """Generate embedding for a document (paper abstract, review, etc.)"""
        return self.embed_text(text, is_query=False)

    def embed_texts(self, texts: List[str], batch_size: int = 32, is_query: bool = False) -> List[List[float]]:
        """Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            batch_size: Batch size for encoding
            is_query: If True, use query prompt for better retrieval
        """
        self._load_model()
        # Qwen3-Embedding 对查询使用 prompt 可提升 1-5% 效果
        if is_query and hasattr(self._model, 'prompts') and 'query' in self._model.prompts:
            embeddings = self._model.encode(
                texts,
                prompt_name="query",
                batch_size=batch_size,
                show_progress_bar=True,
                convert_to_numpy=True
            )
        else:
            embeddings = self._model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=True,
                convert_to_numpy=True
            )
        return embeddings.tolist()

    def get_dimension(self) -> int:
        """Get embedding dimension"""
        return self.settings.embedding_dimension


# Singleton instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
