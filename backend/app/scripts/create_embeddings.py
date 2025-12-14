"""
Create vector embeddings for papers and reviews.

This script:
1. Loads the embedding model
2. Creates embeddings for paper abstracts
3. Creates embeddings for review content
4. Stores embeddings in Neo4j and creates vector indexes
"""

from app.config import get_settings
from app.services.embedding_service import get_embedding_service
import asyncio
import logging
from typing import List, Dict, Any
from neo4j import AsyncGraphDatabase
import gc

# Add parent directory to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

# 文本截断长度（字符数），避免过长文本导致 OOM
MAX_TEXT_LENGTH = 3000


def truncate_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """截断过长的文本"""
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text


def clear_gpu_memory():
    """清理 GPU 显存"""
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    except ImportError:
        pass


class EmbeddingCreator:
    def __init__(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        self.embedding_service = get_embedding_service()
        # 减小 batch_size 避免 OOM（Qwen3-Embedding 显存占用较大）
        self.batch_size = 8
        self.dimension = settings.embedding_dimension
        # 每处理多少条清理一次显存
        self.gc_interval = 500

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

    async def get_reviews_without_embedding(self, limit: int = 1000) -> tuple:
        """Get official reviews (with summary) that don't have embeddings yet.
        Returns: (processed_reviews, skipped_ids) - skipped_ids are reviews without summary
        """
        query = """
        MATCH (r:Review)
        WHERE r.content_embedding IS NULL 
          AND r.content_json IS NOT NULL AND r.content_json <> ''
          AND r.review_type = 'official_review'
        RETURN r.id as id, r.content_json as content_json
        LIMIT $limit
        """
        async with self.driver.session() as session:
            result = await session.run(query, {"limit": limit})
            data = await result.data()

            if not data:
                return [], []

            # Extract text from content_json - focus on summary and key review fields
            import json
            processed = []
            skipped_ids = []

            for item in data:
                content_json = item.get('content_json', '')
                review_id = item['id']
                extracted_text = None

                if content_json:
                    try:
                        content = json.loads(content_json)
                        # Only extract summary (required) + optional strengths/weaknesses
                        summary = content.get('summary')
                        if isinstance(summary, dict):
                            summary = summary.get('value', '')

                        if summary and str(summary).strip():
                            texts = [str(summary)]
                            # Optionally add strengths/weaknesses for richer embedding
                            for key in ['strengths', 'weaknesses', 'strengths_and_weaknesses']:
                                val = content.get(key)
                                if val is None:
                                    continue
                                if isinstance(val, dict):
                                    val = val.get('value', '')
                                if val and str(val).strip():
                                    texts.append(str(val))
                            extracted_text = ' '.join(texts)
                    except json.JSONDecodeError:
                        pass

                if extracted_text and len(extracted_text.strip()) > 20:
                    processed.append(
                        {'id': review_id, 'content': extracted_text})
                else:
                    skipped_ids.append(review_id)

            return processed, skipped_ids

    async def update_paper_embeddings(self, papers: List[Dict]):
        """Generate and store embeddings for papers"""
        if not papers:
            return 0

        # 截断过长文本，避免 OOM
        texts = [truncate_text(p["abstract"]) for p in papers]
        embeddings = self.embedding_service.embed_texts(
            texts, batch_size=self.batch_size)

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

        # 截断过长文本，避免 OOM
        texts = [truncate_text(r["content"]) for r in valid_reviews]
        embeddings = self.embedding_service.embed_texts(
            texts, batch_size=self.batch_size)

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
        logger.info(
            f"Config: batch_size={self.batch_size}, max_text_length={MAX_TEXT_LENGTH}")

        # Create vector indexes
        await self.create_vector_indexes()

        # Process papers
        total_papers = 0
        batch_fetch_size = 100  # 每次从数据库获取的数量（减小以降低内存压力）
        while True:
            papers = await self.get_papers_without_embedding(limit=batch_fetch_size)
            if not papers:
                break

            count = await self.update_paper_embeddings(papers)
            total_papers += count
            logger.info(f"Processed {total_papers} paper embeddings...")

            # 定期清理 GPU 显存
            if total_papers % self.gc_interval == 0:
                clear_gpu_memory()
                logger.info("Cleared GPU memory")

        # 清理显存后处理 reviews
        clear_gpu_memory()

        # Process reviews
        total_reviews = 0
        total_skipped = 0
        batch_fetch_size_reviews = 5000  # 增大批量获取数量

        while True:
            reviews, skipped_ids = await self.get_reviews_without_embedding(limit=batch_fetch_size_reviews)

            # Mark skipped reviews with empty embedding to avoid re-fetching
            if skipped_ids:
                skip_query = """
                UNWIND $ids as id
                MATCH (r:Review {id: id})
                SET r.content_embedding = []
                """
                async with self.driver.session() as session:
                    await session.run(skip_query, {"ids": skipped_ids})
                total_skipped += len(skipped_ids)
                logger.info(
                    f"Skipped {len(skipped_ids)} reviews without extractable text (total skipped: {total_skipped})")

            if not reviews:
                if not skipped_ids:  # No more reviews to process
                    break
                continue  # Continue to process more skipped reviews

            count = await self.update_review_embeddings(reviews)
            total_reviews += count
            logger.info(f"Processed {total_reviews} review embeddings...")

            # 定期清理 GPU 显存
            if total_reviews % self.gc_interval == 0:
                clear_gpu_memory()
                logger.info("Cleared GPU memory")

        logger.info(f"\n{'='*50}")
        logger.info("Embedding Creation Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Paper embeddings created: {total_papers}")
        logger.info(f"Review embeddings created: {total_reviews}")
        logger.info(f"Reviews skipped (no text): {total_skipped}")


async def main():
    creator = EmbeddingCreator()
    try:
        await creator.run()
    finally:
        await creator.close()


if __name__ == "__main__":
    asyncio.run(main())
