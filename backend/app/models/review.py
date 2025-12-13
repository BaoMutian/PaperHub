from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class Review(BaseModel):
    """Review model - simplified to avoid redundancy.
    
    Core fields stored in Neo4j:
    - id, replyto, cdate, review_type, rating, content_json
    
    The 'content' field is parsed from content_json and contains
    all original review fields for dynamic frontend rendering.
    """
    id: str
    replyto: Optional[str] = None
    cdate: Optional[str] = None
    review_type: str = "unknown"  # official_review/rebuttal/comment/decision/meta_review
    rating: Optional[float] = None
    
    # Full content parsed from content_json - for dynamic rendering
    content: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True


class ReviewSummary(BaseModel):
    """LLM-generated summary of reviews"""
    paper_id: str
    overall_sentiment: str  # positive/negative/mixed
    main_strengths: List[str]
    main_weaknesses: List[str]
    key_questions: List[str]
    recommendation: str
    summary_text: str
