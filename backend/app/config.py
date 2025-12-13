import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Neo4j Configuration
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password123"

    # OpenRouter API Configuration (API key must be set via environment variable)
    openrouter_api_key: str = ""  # Required: set OPENROUTER_API_KEY env var
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "google/gemini-2.5-flash"

    # Embedding Configuration
    # CPU 服务器推荐使用轻量模型，GPU 可用 Qwen3-Embedding
    # 轻量选项: "sentence-transformers/all-MiniLM-L6-v2" (dim=384, ~23MB, 快)
    # 高质量选项: "Qwen/Qwen3-Embedding-0.6B" (dim=1024, ~1.2GB, 需GPU)
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # Application Settings
    app_name: str = "AI Conference Papers KG"
    debug: bool = True

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
