from neo4j import AsyncGraphDatabase, AsyncDriver
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
import logging

from ..config import get_settings

logger = logging.getLogger(__name__)


class Neo4jService:
    def __init__(self):
        self.settings = get_settings()
        self._driver: Optional[AsyncDriver] = None
    
    async def connect(self):
        """Initialize Neo4j connection"""
        if self._driver is None:
            self._driver = AsyncGraphDatabase.driver(
                self.settings.neo4j_uri,
                auth=(self.settings.neo4j_user, self.settings.neo4j_password)
            )
            # Verify connectivity
            await self._driver.verify_connectivity()
            logger.info("Connected to Neo4j successfully")
    
    async def close(self):
        """Close Neo4j connection"""
        if self._driver:
            await self._driver.close()
            self._driver = None
            logger.info("Neo4j connection closed")
    
    @asynccontextmanager
    async def session(self):
        """Get a session context manager"""
        if self._driver is None:
            await self.connect()
        async with self._driver.session() as session:
            yield session
    
    async def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results"""
        async with self.session() as session:
            result = await session.run(query, parameters or {})
            records = await result.data()
            return records
    
    async def execute_write(self, query: str, parameters: Dict[str, Any] = None) -> Any:
        """Execute a write transaction"""
        async with self.session() as session:
            result = await session.run(query, parameters or {})
            summary = await result.consume()
            return summary
    
    async def create_schema(self):
        """Create graph schema: constraints and indexes"""
        schema_queries = [
            # Constraints (also creates indexes)
            "CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT author_id IF NOT EXISTS FOR (a:Author) REQUIRE a.authorid IS UNIQUE",
            "CREATE CONSTRAINT review_id IF NOT EXISTS FOR (r:Review) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT keyword_name IF NOT EXISTS FOR (k:Keyword) REQUIRE k.name IS UNIQUE",
            "CREATE CONSTRAINT conference_key IF NOT EXISTS FOR (c:Conference) REQUIRE (c.name, c.year) IS UNIQUE",
            
            # Additional indexes for common queries
            "CREATE INDEX paper_status IF NOT EXISTS FOR (p:Paper) ON (p.status)",
            "CREATE INDEX paper_conference IF NOT EXISTS FOR (p:Paper) ON (p.conference)",
            "CREATE INDEX review_type IF NOT EXISTS FOR (r:Review) ON (r.review_type)",
            "CREATE INDEX review_rating IF NOT EXISTS FOR (r:Review) ON (r.rating)",
            "CREATE INDEX author_name IF NOT EXISTS FOR (a:Author) ON (a.name)",
        ]
        
        for query in schema_queries:
            try:
                await self.execute_write(query)
                logger.info(f"Executed: {query[:50]}...")
            except Exception as e:
                logger.warning(f"Schema query warning: {e}")
        
        logger.info("Schema creation completed")
    
    async def create_vector_index(self, index_name: str, label: str, property_name: str, dimension: int = 384):
        """Create vector index for semantic search"""
        query = f"""
        CREATE VECTOR INDEX {index_name} IF NOT EXISTS
        FOR (n:{label})
        ON n.{property_name}
        OPTIONS {{
            indexConfig: {{
                `vector.dimensions`: {dimension},
                `vector.similarity_function`: 'cosine'
            }}
        }}
        """
        try:
            await self.execute_write(query)
            logger.info(f"Vector index '{index_name}' created for {label}.{property_name}")
        except Exception as e:
            logger.warning(f"Vector index creation warning: {e}")
    
    # Paper operations
    async def get_papers(
        self, 
        skip: int = 0, 
        limit: int = 20,
        conference: Optional[str] = None,
        status: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> tuple[List[Dict], int]:
        """Get paginated papers with optional filters"""
        where_clauses = []
        params = {"skip": skip, "limit": limit}
        
        if conference:
            where_clauses.append("p.conference = $conference")
            params["conference"] = conference
        if status:
            where_clauses.append("p.status = $status")
            params["status"] = status
        if keyword:
            where_clauses.append("EXISTS { MATCH (p)-[:HAS_KEYWORD]->(k:Keyword) WHERE k.name CONTAINS $keyword }")
            params["keyword"] = keyword.lower()
        
        where_clause = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        # Get papers with avg rating
        query = f"""
        MATCH (p:Paper)
        {where_clause}
        OPTIONAL MATCH (p)-[:HAS_REVIEW]->(r:Review)
        WHERE r.rating IS NOT NULL
        WITH p, avg(r.rating) as avg_rating
        OPTIONAL MATCH (p)<-[:AUTHORED]-(a:Author)
        WITH p, avg_rating, collect(a.name) as authors
        RETURN p.id as id, p.title as title, p.abstract as abstract,
               p.status as status, p.conference as conference,
               p.forum_link as forum_link, p.pdf_link as pdf_link,
               p.creation_date as creation_date, p.keywords as keywords,
               authors, avg_rating
        ORDER BY p.creation_date DESC
        SKIP $skip LIMIT $limit
        """
        
        count_query = f"""
        MATCH (p:Paper)
        {where_clause}
        RETURN count(p) as total
        """
        
        papers = await self.execute_query(query, params)
        count_result = await self.execute_query(count_query, params)
        total = count_result[0]["total"] if count_result else 0
        
        return papers, total
    
    async def get_paper_by_id(self, paper_id: str) -> Optional[Dict]:
        """Get paper details with reviews and authors"""
        query = """
        MATCH (p:Paper {id: $paper_id})
        OPTIONAL MATCH (p)<-[au:AUTHORED]-(a:Author)
        WITH p, collect({name: a.name, authorid: a.authorid, order: au.order}) as authors
        OPTIONAL MATCH (p)-[:HAS_REVIEW]->(r:Review)
        WITH p, authors, collect(r {.*}) as reviews
        OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
        RETURN p {.*, authors: authors, reviews: reviews, keywords: collect(k.name)}
        """
        result = await self.execute_query(query, {"paper_id": paper_id})
        return result[0]["p"] if result else None
    
    # Author operations
    async def get_author_by_id(self, authorid: str) -> Optional[Dict]:
        """Get author details with papers and collaborators"""
        query = """
        MATCH (a:Author {authorid: $authorid})
        OPTIONAL MATCH (a)-[:AUTHORED]->(p:Paper)
        WITH a, collect(p {.id, .title, .status, .conference}) as papers
        OPTIONAL MATCH (a)-[:AUTHORED]->(p2:Paper)<-[:AUTHORED]-(collab:Author)
        WHERE collab.authorid <> a.authorid
        WITH a, papers, collab, count(DISTINCT p2) as collab_count
        ORDER BY collab_count DESC
        WITH a, papers, collect({authorid: collab.authorid, name: collab.name, count: collab_count})[..10] as collaborators
        RETURN a {.*, papers: papers, collaborators: collaborators}
        """
        result = await self.execute_query(query, {"authorid": authorid})
        return result[0]["a"] if result else None
    
    async def get_collaboration_network(
        self, 
        min_collaborations: int = 1,
        conference: Optional[str] = None,
        limit: int = 500
    ) -> Dict[str, Any]:
        """Get author collaboration network for visualization"""
        where_clause = ""
        params = {"min_collab": min_collaborations, "limit": limit}
        
        if conference:
            where_clause = "WHERE p.conference = $conference"
            params["conference"] = conference
        
        query = f"""
        MATCH (a1:Author)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(a2:Author)
        {where_clause}
        WHERE a1.authorid < a2.authorid
        WITH a1, a2, count(DISTINCT p) as collaborations, collect(DISTINCT p.id)[..5] as paper_ids
        WHERE collaborations >= $min_collab
        RETURN a1.authorid as source_id, a1.name as source_name,
               a2.authorid as target_id, a2.name as target_name,
               collaborations, paper_ids
        ORDER BY collaborations DESC
        LIMIT $limit
        """
        
        results = await self.execute_query(query, params)
        
        # Build nodes and edges
        nodes = {}
        edges = []
        
        for r in results:
            # Add source node
            if r["source_id"] not in nodes:
                nodes[r["source_id"]] = {
                    "id": r["source_id"],
                    "label": r["source_name"],
                    "type": "author"
                }
            # Add target node
            if r["target_id"] not in nodes:
                nodes[r["target_id"]] = {
                    "id": r["target_id"],
                    "label": r["target_name"],
                    "type": "author"
                }
            # Add edge
            edges.append({
                "source": r["source_id"],
                "target": r["target_id"],
                "weight": r["collaborations"],
                "papers": r["paper_ids"]
            })
        
        return {
            "nodes": list(nodes.values()),
            "links": edges,
            "total_authors": len(nodes),
            "total_collaborations": len(edges)
        }
    
    # Search operations
    async def search_papers_semantic(
        self, 
        embedding: List[float], 
        limit: int = 20,
        min_score: float = 0.5
    ) -> List[Dict]:
        """Search papers using vector similarity"""
        query = """
        CALL db.index.vector.queryNodes('paper_abstract_embedding', $limit, $embedding)
        YIELD node, score
        WHERE score >= $min_score
        OPTIONAL MATCH (node)<-[:AUTHORED]-(a:Author)
        RETURN node.id as id, node.title as title, node.abstract as abstract,
               node.status as status, node.conference as conference,
               collect(a.name) as authors, score
        ORDER BY score DESC
        """
        return await self.execute_query(query, {
            "embedding": embedding,
            "limit": limit,
            "min_score": min_score
        })
    
    async def search_papers_text(self, search_text: str, limit: int = 20) -> List[Dict]:
        """Full-text search on paper titles and abstracts"""
        query = """
        MATCH (p:Paper)
        WHERE p.title CONTAINS $search OR p.abstract CONTAINS $search
        OPTIONAL MATCH (p)<-[:AUTHORED]-(a:Author)
        RETURN p.id as id, p.title as title, p.abstract as abstract,
               p.status as status, p.conference as conference,
               collect(a.name) as authors
        LIMIT $limit
        """
        return await self.execute_query(query, {"search": search_text, "limit": limit})
    
    # Statistics
    async def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics"""
        query = """
        MATCH (p:Paper)
        WITH count(p) as total_papers
        MATCH (a:Author)
        WITH total_papers, count(a) as total_authors
        MATCH (r:Review)
        WITH total_papers, total_authors, count(r) as total_reviews
        MATCH (k:Keyword)
        RETURN total_papers, total_authors, total_reviews, count(k) as total_keywords
        """
        result = await self.execute_query(query)
        return result[0] if result else {}
    
    async def get_conference_stats(self) -> List[Dict]:
        """Get statistics per conference"""
        query = """
        MATCH (p:Paper)
        WITH p.conference as conference, p.status as status, count(*) as count
        RETURN conference, status, count
        ORDER BY conference, status
        """
        return await self.execute_query(query)


# Singleton instance
_neo4j_service: Optional[Neo4jService] = None


async def get_neo4j_service() -> Neo4jService:
    global _neo4j_service
    if _neo4j_service is None:
        _neo4j_service = Neo4jService()
        await _neo4j_service.connect()
    return _neo4j_service

