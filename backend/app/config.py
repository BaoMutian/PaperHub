import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Neo4j Configuration
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password123"

    # OpenRouter API Configuration
    openrouter_api_key: str = "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"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "google/gemini-2.5-flash-lite"

    # Embedding Configuration
    # 使用 Qwen3-Embedding 获得更好的中英文语义理解
    embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"
    embedding_dimension: int = 1024

    # Application Settings
    app_name: str = "AI Conference Papers KG"
    debug: bool = True

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
