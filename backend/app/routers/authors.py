from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
import logging

from ..services.neo4j_service import Neo4jService, get_neo4j_service
from ..models.author import Author, AuthorDetail

router = APIRouter(prefix="/authors", tags=["authors"])
logger = logging.getLogger(__name__)


@router.get("/search")
async def search_authors(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Search authors by name"""
    query = """
    MATCH (a:Author)
    WHERE a.name CONTAINS $search
    OPTIONAL MATCH (a)-[:AUTHORED]->(p:Paper)
    WITH a, count(p) as paper_count
    RETURN a.authorid as authorid, a.name as name, paper_count
    ORDER BY paper_count DESC
    LIMIT $limit
    """
    results = await neo4j.execute_query(query, {"search": q, "limit": limit})
    
    return {
        "query": q,
        "results": [Author(**r) for r in results],
        "count": len(results)
    }


@router.get("/top")
async def get_top_authors(
    conference: Optional[str] = Query(None, description="Filter by conference"),
    limit: int = Query(50, ge=1, le=200),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get top authors by paper count"""
    where_clause = ""
    params = {"limit": limit}
    
    if conference:
        where_clause = "WHERE p.conference = $conference"
        params["conference"] = conference
    
    query = f"""
    MATCH (a:Author)-[:AUTHORED]->(p:Paper)
    {where_clause}
    WITH a, count(DISTINCT p) as paper_count,
         sum(CASE WHEN p.status IN ['poster', 'spotlight', 'oral'] THEN 1 ELSE 0 END) as accepted_count
    WHERE paper_count >= 2
    RETURN a.authorid as authorid, a.name as name, paper_count, accepted_count,
           round(toFloat(accepted_count) / paper_count * 100, 2) as acceptance_rate
    ORDER BY paper_count DESC
    LIMIT $limit
    """
    
    results = await neo4j.execute_query(query, params)
    return results


@router.get("/{authorid}")
async def get_author(
    authorid: str,
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get author details with papers and collaborators"""
    author = await neo4j.get_author_by_id(authorid)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Calculate stats
    papers = author.get("papers", [])
    conferences = {}
    accepted = 0
    
    for p in papers:
        conf = p.get("conference", "Unknown")
        conferences[conf] = conferences.get(conf, 0) + 1
        if p.get("status") in ["poster", "spotlight", "oral"]:
            accepted += 1
    
    accept_rate = round(accepted / len(papers) * 100, 2) if papers else 0
    
    return {
        "authorid": author["authorid"],
        "name": author["name"],
        "paper_count": len(papers),
        "papers": papers,
        "collaborators": author.get("collaborators", [])[:20],
        "conferences": conferences,
        "accept_rate": accept_rate
    }


@router.get("/{authorid}/collaborators")
async def get_author_collaborators(
    authorid: str,
    limit: int = Query(50, ge=1, le=200),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get detailed collaborator information for an author"""
    query = """
    MATCH (a:Author {authorid: $authorid})-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(collab:Author)
    WHERE collab.authorid <> $authorid
    WITH collab, collect(DISTINCT p.id) as paper_ids, count(DISTINCT p) as collaboration_count
    RETURN collab.authorid as authorid, collab.name as name, 
           collaboration_count, paper_ids
    ORDER BY collaboration_count DESC
    LIMIT $limit
    """
    
    results = await neo4j.execute_query(query, {"authorid": authorid, "limit": limit})
    
    if not results:
        # Check if author exists
        check_query = "MATCH (a:Author {authorid: $authorid}) RETURN a"
        check = await neo4j.execute_query(check_query, {"authorid": authorid})
        if not check:
            raise HTTPException(status_code=404, detail="Author not found")
    
    return {
        "authorid": authorid,
        "collaborators": results,
        "count": len(results)
    }

