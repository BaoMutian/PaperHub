from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class PaperBase(BaseModel):
    title: str
    abstract: str
    keywords: List[str] = []
    status: str  # rejected/poster/spotlight/oral/withdrawn/desk_rejected
    conference: str  # ICML/ICLR/NeurIPS


class PaperCreate(PaperBase):
    id: str
    authors: List[str]
    authorids: List[str]
    primary_area: Optional[str] = None
    tldr: Optional[str] = None
    creation_date: Optional[str] = None
    modification_date: Optional[str] = None
    forum_link: Optional[str] = None
    pdf_link: Optional[str] = None
    venue: Optional[str] = None


class Paper(PaperBase):
    id: str
    authors: List[str] = []
    forum_link: Optional[str] = None
    pdf_link: Optional[str] = None
    creation_date: Optional[str] = None
    avg_rating: Optional[float] = None
    
    class Config:
        from_attributes = True


class PaperList(BaseModel):
    papers: List[Paper]
    total: int
    page: int
    page_size: int


class PaperDetail(Paper):
    authorids: List[str] = []
    primary_area: Optional[str] = None
    tldr: Optional[str] = None
    venue: Optional[str] = None
    modification_date: Optional[str] = None
    review_count: int = 0
    reviews: List["Review"] = []


# Forward reference for Review
from .review import Review
PaperDetail.model_rebuild()

