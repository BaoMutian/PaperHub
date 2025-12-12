from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class QARequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None  # e.g., current paper_id
    include_sources: bool = True


class QAResponse(BaseModel):
    answer: str
    cypher_query: Optional[str] = None
    raw_results: Optional[List[Dict[str, Any]]] = None
    sources: List[Dict[str, Any]] = []
    confidence: float = 0.0
    query_type: str = "unknown"  # stats/search/summary/comparison


class SearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    limit: int = 20
    use_semantic: bool = True  # Use vector search


class SearchResult(BaseModel):
    papers: List[Dict[str, Any]]
    total: int
    query_embedding_used: bool = False

