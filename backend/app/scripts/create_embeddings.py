"""
Create vector embeddings for papers and reviews.

This script:
1. Loads the embedding model
2. Creates embeddings for paper abstracts
3. Creates embeddings for review content
4. Stores embeddings in Neo4j and creates vector indexes
"""

import asyncio
import logging
from typing import List, Dict, Any
from neo4j import AsyncGraphDatabase

# Add parent directory to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.embedding_service import get_embedding_service
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


class EmbeddingCreator:
    def __init__(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        self.embedding_service = get_embedding_service()
        self.batch_size = 50
        self.dimension = settings.embedding_dimension
    
    async def close(self):
        await self.driver.close()
    
    async def create_vector_indexes(self):
        """Create vector indexes in Neo4j"""
        indexes = [
            ("paper_abstract_embedding", "Paper", "abstract_embedding"),
            ("review_content_embedding", "Review", "content_embedding")
        ]
        
        async with self.driver.session() as session:
            for index_name, label, property_name in indexes:
                query = f"""
                CREATE VECTOR INDEX {index_name} IF NOT EXISTS
                FOR (n:{label})
                ON n.{property_name}
                OPTIONS {{
                    indexConfig: {{
                        `vector.dimensions`: {self.dimension},
                        `vector.similarity_function`: 'cosine'
                    }}
                }}
                """
                try:
                    await session.run(query)
                    logger.info(f"Created vector index: {index_name}")
                except Exception as e:
                    logger.warning(f"Vector index warning: {e}")
    
    async def get_papers_without_embedding(self, limit: int = 1000) -> List[Dict]:
        """Get papers that don't have embeddings yet"""
        query = """
        MATCH (p:Paper)
        WHERE p.abstract_embedding IS NULL AND p.abstract IS NOT NULL AND p.abstract <> ''
        RETURN p.id as id, p.abstract as abstract
        LIMIT $limit
        """
        async with self.driver.session() as session:
            result = await session.run(query, {"limit": limit})
            return await result.data()
    
    async def get_reviews_without_embedding(self, limit: int = 1000) -> List[Dict]:
        """Get reviews that don't have embeddings yet"""
        query = """
        MATCH (r:Review)
        WHERE r.content_embedding IS NULL 
          AND (r.summary IS NOT NULL OR r.strengths IS NOT NULL OR r.weaknesses IS NOT NULL)
        RETURN r.id as id, 
               coalesce(r.summary, '') + ' ' + coalesce(r.strengths, '') + ' ' + coalesce(r.weaknesses, '') as content
        LIMIT $limit
        """
        async with self.driver.session() as session:
            result = await session.run(query, {"limit": limit})
            return await result.data()
    
    async def update_paper_embeddings(self, papers: List[Dict]):
        """Generate and store embeddings for papers"""
        if not papers:
            return 0
        
        # Generate embeddings
        texts = [p["abstract"] for p in papers]
        embeddings = self.embedding_service.embed_texts(texts, batch_size=self.batch_size)
        
        # Store in Neo4j
        query = """
        UNWIND $papers as paper
        MATCH (p:Paper {id: paper.id})
        SET p.abstract_embedding = paper.embedding
        """
        
        paper_data = [
            {"id": p["id"], "embedding": emb}
            for p, emb in zip(papers, embeddings)
        ]
        
        async with self.driver.session() as session:
            await session.run(query, {"papers": paper_data})
        
        return len(papers)
    
    async def update_review_embeddings(self, reviews: List[Dict]):
        """Generate and store embeddings for reviews"""
        if not reviews:
            return 0
        
        # Filter out empty content
        valid_reviews = [r for r in reviews if r["content"].strip()]
        if not valid_reviews:
            return 0
        
        # Generate embeddings
        texts = [r["content"] for r in valid_reviews]
        embeddings = self.embedding_service.embed_texts(texts, batch_size=self.batch_size)
        
        # Store in Neo4j
        query = """
        UNWIND $reviews as review
        MATCH (r:Review {id: review.id})
        SET r.content_embedding = review.embedding
        """
        
        review_data = [
            {"id": r["id"], "embedding": emb}
            for r, emb in zip(valid_reviews, embeddings)
        ]
        
        async with self.driver.session() as session:
            await session.run(query, {"reviews": review_data})
        
        return len(valid_reviews)
    
    async def run(self):
        """Main embedding creation process"""
        logger.info("Starting embedding creation...")
        
        # Create vector indexes
        await self.create_vector_indexes()
        
        # Process papers
        total_papers = 0
        while True:
            papers = await self.get_papers_without_embedding(limit=500)
            if not papers:
                break
            
            count = await self.update_paper_embeddings(papers)
            total_papers += count
            logger.info(f"Processed {total_papers} paper embeddings...")
        
        # Process reviews
        total_reviews = 0
        while True:
            reviews = await self.get_reviews_without_embedding(limit=500)
            if not reviews:
                break
            
            count = await self.update_review_embeddings(reviews)
            total_reviews += count
            logger.info(f"Processed {total_reviews} review embeddings...")
        
        logger.info(f"\n{'='*50}")
        logger.info("Embedding Creation Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Paper embeddings created: {total_papers}")
        logger.info(f"Review embeddings created: {total_reviews}")


async def main():
    creator = EmbeddingCreator()
    try:
        await creator.run()
    finally:
        await creator.close()


if __name__ == "__main__":
    asyncio.run(main())

