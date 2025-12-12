from pydantic import BaseModel
from typing import Optional, List


class Author(BaseModel):
    authorid: str
    name: str
    paper_count: int = 0
    
    class Config:
        from_attributes = True


class AuthorDetail(Author):
    papers: List["PaperBrief"] = []
    collaborators: List["CollaboratorBrief"] = []
    conferences: dict = {}  # {conference: count}
    accept_rate: Optional[float] = None


class PaperBrief(BaseModel):
    id: str
    title: str
    status: str
    conference: str
    year: int = 2025


class CollaboratorBrief(BaseModel):
    authorid: str
    name: str
    collaboration_count: int


class AuthorCollaboration(BaseModel):
    """For Force Graph visualization"""
    source: str  # authorid
    target: str  # authorid
    weight: int  # number of collaborations
    papers: List[str] = []  # paper ids


AuthorDetail.model_rebuild()

