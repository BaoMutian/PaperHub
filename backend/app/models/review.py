from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class Review(BaseModel):
    id: str
    replyto: Optional[str] = None
    number: Optional[int] = None
    cdate: Optional[str] = None
    mdate: Optional[str] = None
    review_type: str = "unknown"  # official_review/rebuttal/comment/decision
    rating: Optional[float] = None
    confidence: Optional[float] = None
    
    # Content fields (varies by conference)
    summary: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    questions: Optional[str] = None
    decision: Optional[str] = None
    comment: Optional[str] = None
    
    # Full content for reference
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

