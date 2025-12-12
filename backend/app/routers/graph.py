from fastapi import APIRouter, Query, Depends
from typing import Optional
import logging

from ..services.neo4j_service import Neo4jService, get_neo4j_service
from ..models.graph import GraphData, CollaborationNetwork

router = APIRouter(prefix="/graph", tags=["graph"])
logger = logging.getLogger(__name__)


@router.get("/collaboration-network", response_model=CollaborationNetwork)
async def get_collaboration_network(
    conference: Optional[str] = Query(None, description="Filter by conference"),
    min_collaborations: int = Query(2, ge=1, description="Minimum collaborations to include"),
    limit: int = Query(500, ge=10, le=2000, description="Maximum number of edges"),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get author collaboration network for Force Graph visualization"""
    network = await neo4j.get_collaboration_network(
        min_collaborations=min_collaborations,
        conference=conference,
        limit=limit
    )
    
    # Add size based on degree (number of connections)
    node_degrees = {}
    for link in network["links"]:
        node_degrees[link["source"]] = node_degrees.get(link["source"], 0) + 1
        node_degrees[link["target"]] = node_degrees.get(link["target"], 0) + 1
    
    for node in network["nodes"]:
        degree = node_degrees.get(node["id"], 1)
        node["size"] = min(5 + degree * 2, 30)  # Size between 5 and 30
        node["properties"] = {"degree": degree}
    
    # Calculate average collaborations
    avg_collab = sum(l["weight"] for l in network["links"]) / len(network["links"]) if network["links"] else 0
    
    return CollaborationNetwork(
        nodes=network["nodes"],
        links=network["links"],
        total_authors=network["total_authors"],
        total_collaborations=network["total_collaborations"],
        avg_collaborations=round(avg_collab, 2)
    )


@router.get("/paper-keyword-network")
async def get_paper_keyword_network(
    conference: Optional[str] = Query(None, description="Filter by conference"),
    status: Optional[str] = Query(None, description="Filter by status"),
    min_papers: int = Query(5, ge=1, description="Minimum papers per keyword"),
    limit: int = Query(100, ge=10, le=500, description="Maximum keywords"),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get keyword co-occurrence network"""
    where_clauses = []
    params = {"min_papers": min_papers, "limit": limit}
    
    if conference:
        where_clauses.append("p.conference = $conference")
        params["conference"] = conference
    if status:
        where_clauses.append("p.status = $status")
        params["status"] = status
    
    where_clause = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    
    # Get keywords with enough papers
    keyword_query = f"""
    MATCH (p:Paper)-[:HAS_KEYWORD]->(k:Keyword)
    {where_clause}
    WITH k, count(DISTINCT p) as paper_count
    WHERE paper_count >= $min_papers
    RETURN k.name as name, paper_count
    ORDER BY paper_count DESC
    LIMIT $limit
    """
    
    keywords = await neo4j.execute_query(keyword_query, params)
    keyword_names = [k["name"] for k in keywords]
    
    # Get co-occurrence
    cooccur_query = f"""
    MATCH (p:Paper)-[:HAS_KEYWORD]->(k1:Keyword)
    MATCH (p)-[:HAS_KEYWORD]->(k2:Keyword)
    {where_clause}
    WHERE k1.name < k2.name 
      AND k1.name IN $keywords 
      AND k2.name IN $keywords
    WITH k1.name as kw1, k2.name as kw2, count(DISTINCT p) as cooccurrence
    WHERE cooccurrence >= 2
    RETURN kw1, kw2, cooccurrence
    ORDER BY cooccurrence DESC
    LIMIT 500
    """
    
    params["keywords"] = keyword_names
    cooccurrences = await neo4j.execute_query(cooccur_query, params)
    
    # Build nodes and edges
    nodes = [
        {
            "id": k["name"],
            "label": k["name"],
            "type": "keyword",
            "size": min(5 + k["paper_count"], 40),
            "properties": {"paper_count": k["paper_count"]}
        }
        for k in keywords
    ]
    
    edges = [
        {
            "source": c["kw1"],
            "target": c["kw2"],
            "weight": c["cooccurrence"],
            "type": "cooccurrence"
        }
        for c in cooccurrences
    ]
    
    return {
        "nodes": nodes,
        "links": edges,
        "total_keywords": len(nodes),
        "total_edges": len(edges)
    }


@router.get("/author-ego-network/{authorid}")
async def get_author_ego_network(
    authorid: str,
    depth: int = Query(1, ge=1, le=2, description="Network depth"),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get ego network centered on a specific author"""
    if depth == 1:
        query = """
        MATCH (center:Author {authorid: $authorid})
        OPTIONAL MATCH (center)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(collab:Author)
        WHERE collab.authorid <> center.authorid
        WITH center, collab, count(DISTINCT p) as weight, collect(DISTINCT p.id)[..5] as papers
        RETURN center.authorid as center_id, center.name as center_name,
               collect({
                   id: collab.authorid, 
                   name: collab.name, 
                   weight: weight,
                   papers: papers
               }) as collaborators
        """
    else:
        query = """
        MATCH (center:Author {authorid: $authorid})
        CALL {
            WITH center
            MATCH (center)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(level1:Author)
            WHERE level1.authorid <> center.authorid
            WITH DISTINCT level1
            OPTIONAL MATCH (level1)-[:AUTHORED]->(p2:Paper)<-[:AUTHORED]-(level2:Author)
            WHERE level2.authorid <> level1.authorid
            RETURN level1, level2, count(DISTINCT p2) as l2_weight
        }
        WITH center, level1, collect({id: level2.authorid, name: level2.name, weight: l2_weight}) as level2_collabs
        MATCH (center)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(level1)
        WITH center, level1, count(DISTINCT p) as l1_weight, level2_collabs
        RETURN center.authorid as center_id, center.name as center_name,
               collect({
                   id: level1.authorid,
                   name: level1.name,
                   weight: l1_weight,
                   collaborators: level2_collabs[..10]
               }) as collaborators
        """
    
    result = await neo4j.execute_query(query, {"authorid": authorid})
    
    if not result:
        return {"error": "Author not found", "nodes": [], "links": []}
    
    data = result[0]
    
    # Build visualization data
    nodes = [{
        "id": data["center_id"],
        "label": data["center_name"],
        "type": "center",
        "size": 20,
        "color": "#ff6b6b"
    }]
    
    links = []
    seen_nodes = {data["center_id"]}
    
    for collab in data.get("collaborators", []):
        if collab.get("id") and collab["id"] not in seen_nodes:
            nodes.append({
                "id": collab["id"],
                "label": collab["name"],
                "type": "level1",
                "size": min(8 + collab.get("weight", 1) * 2, 18),
                "color": "#4ecdc4"
            })
            seen_nodes.add(collab["id"])
            
            links.append({
                "source": data["center_id"],
                "target": collab["id"],
                "weight": collab.get("weight", 1),
                "type": "collaboration"
            })
            
            # Add level 2 if present
            if depth == 2 and collab.get("collaborators"):
                for l2 in collab["collaborators"]:
                    if l2.get("id") and l2["id"] not in seen_nodes:
                        nodes.append({
                            "id": l2["id"],
                            "label": l2["name"],
                            "type": "level2",
                            "size": 6,
                            "color": "#95e1d3"
                        })
                        seen_nodes.add(l2["id"])
                        
                        links.append({
                            "source": collab["id"],
                            "target": l2["id"],
                            "weight": l2.get("weight", 1),
                            "type": "collaboration"
                        })
    
    return {
        "center": {"id": data["center_id"], "name": data["center_name"]},
        "nodes": nodes,
        "links": links,
        "total_nodes": len(nodes),
        "total_links": len(links)
    }

