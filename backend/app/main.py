"""
AI Conference Papers Knowledge Graph API

A FastAPI backend for querying and analyzing AI conference papers
from ICLR, ICML, and NeurIPS 2025.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import get_settings
from .services.neo4j_service import get_neo4j_service, _neo4j_service
from .routers import papers_router, authors_router, qa_router, graph_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting up...")
    neo4j = await get_neo4j_service()
    logger.info("Neo4j connection established")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    if _neo4j_service:
        await _neo4j_service.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    description="""
    ## AI Conference Papers Knowledge Graph API
    
    Query and analyze papers from top AI conferences (ICLR, ICML, NeurIPS 2025).
    
    ### Features
    - **Paper Search**: Full-text and semantic search
    - **Author Network**: Collaboration graph visualization
    - **Natural Language QA**: Ask questions in plain language
    - **Review Analysis**: LLM-powered review summarization
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(papers_router)
app.include_router(authors_router)
app.include_router(qa_router)
app.include_router(graph_router)


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "AI Conference Papers Knowledge Graph API",
        "docs": "/docs",
        "endpoints": {
            "papers": "/papers",
            "authors": "/authors",
            "qa": "/qa",
            "graph": "/graph"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        neo4j = await get_neo4j_service()
        # Simple query to verify connection
        result = await neo4j.execute_query("RETURN 1 as test")
        db_status = "connected" if result else "error"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status
    }

