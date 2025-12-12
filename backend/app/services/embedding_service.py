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

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        self._load_model()
        embedding = self._model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        self._load_model()
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
