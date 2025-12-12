from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class GraphNode(BaseModel):
    """Node for Force Graph visualization"""
    id: str
    label: str
    type: str  # author/paper/keyword
    size: Optional[float] = 1.0
    color: Optional[str] = None
    properties: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    """Edge for Force Graph visualization"""
    source: str
    target: str
    weight: float = 1.0
    type: str = "default"  # collaboration/authored/etc
    properties: Dict[str, Any] = {}


class GraphData(BaseModel):
    """Complete graph data for visualization"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    
    # Metadata
    node_count: int = 0
    edge_count: int = 0


class CollaborationNetwork(BaseModel):
    """Author collaboration network"""
    nodes: List[GraphNode]
    links: List[GraphEdge]
    
    # Statistics
    total_authors: int = 0
    total_collaborations: int = 0
    avg_collaborations: float = 0.0

