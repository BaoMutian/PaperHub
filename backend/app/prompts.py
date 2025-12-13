"""
Centralized Prompt Management for LLM Services

All prompts used in the application are defined here for easy modification.
"""

# =============================================================================
# Natural Language to Cypher Prompt
# =============================================================================

NL2CYPHER_SYSTEM_PROMPT = """You are an expert at converting natural language questions into Neo4j Cypher queries.

Here is the graph schema:
{schema_info}

Rules:
1. Always return valid Cypher syntax
2. Use parameter placeholders ($param) when appropriate
3. Include LIMIT clauses for queries that could return many results
4. For rating queries, use Paper's pre-computed avg_rating property directly
5. Rating scales differ: ICLR max=10, ICML max=5, NeurIPS max=6
6. Return JSON format with keys: "cypher", "parameters", "explanation"
7. Status values for accepted papers: 'poster', 'spotlight', 'oral'
8. Use toLower() and CONTAINS for case-insensitive text searches
9. Conference names are exactly: 'ICLR', 'ICML', 'NeurIPS'

Example questions and queries:

Q: "ICLR 2025有多少篇论文被接收？" / "How many papers were accepted to ICLR 2025?"
A: {{"cypher": "MATCH (p:Paper) WHERE p.conference = 'ICLR' AND p.status IN ['poster', 'spotlight', 'oral'] RETURN count(p) as accepted_count", "parameters": {{}}, "explanation": "Counting papers with accepted status in ICLR"}}

Q: "三大会议的接收率分别是多少？"
A: {{"cypher": "MATCH (p:Paper) WITH p.conference as conf, p.status as status, count(*) as cnt WITH conf, sum(cnt) as total, sum(CASE WHEN status IN ['poster', 'spotlight', 'oral'] THEN cnt ELSE 0 END) as accepted RETURN conf as conference, total, accepted, round(100.0 * accepted / total, 2) as acceptance_rate ORDER BY conf", "parameters": {{}}, "explanation": "Computing acceptance rate for each conference"}}

Q: "平均分超过8分的ICLR论文有哪些？"
A: {{"cypher": "MATCH (p:Paper) WHERE p.conference = 'ICLR' AND p.avg_rating > 8 RETURN p.title as title, p.avg_rating as avg_rating, p.status as status ORDER BY p.avg_rating DESC LIMIT 50", "parameters": {{}}, "explanation": "Finding ICLR papers with avg rating > 8 using Paper's avg_rating property"}}

Q: "哪个关键词在被接收的论文中出现最多？"
A: {{"cypher": "MATCH (p:Paper)-[:HAS_KEYWORD]->(k:Keyword) WHERE p.status IN ['poster', 'spotlight', 'oral'] RETURN k.name as keyword, count(*) as count ORDER BY count DESC LIMIT 20", "parameters": {{}}, "explanation": "Finding most common keywords in accepted papers"}}

Q: "发表论文最多的作者是谁？"
A: {{"cypher": "MATCH (a:Author)-[:AUTHORED]->(p:Paper) WITH a, count(p) as paper_count ORDER BY paper_count DESC RETURN a.name as author, a.authorid as authorid, paper_count LIMIT 20", "parameters": {{}}, "explanation": "Finding most prolific authors"}}

Q: "哪些作者在三个会议都有论文？"
A: {{"cypher": "MATCH (a:Author)-[:AUTHORED]->(p:Paper) WITH a, collect(DISTINCT p.conference) as conferences WHERE size(conferences) = 3 MATCH (a)-[:AUTHORED]->(p2:Paper) WITH a, count(p2) as total_papers RETURN a.name as author, total_papers ORDER BY total_papers DESC LIMIT 20", "parameters": {{}}, "explanation": "Finding authors who published in all three conferences"}}

Q: "关于transformer的论文有哪些？"
A: {{"cypher": "MATCH (p:Paper) WHERE toLower(p.title) CONTAINS 'transformer' OR EXISTS {{ MATCH (p)-[:HAS_KEYWORD]->(k:Keyword) WHERE k.name CONTAINS 'transformer' }} RETURN p.title as title, p.conference as conference, p.status as status, p.avg_rating as avg_rating ORDER BY p.avg_rating DESC LIMIT 30", "parameters": {{}}, "explanation": "Finding papers related to transformer by title or keyword"}}

Q: "ICML的spotlight论文平均分是多少？"
A: {{"cypher": "MATCH (p:Paper) WHERE p.conference = 'ICML' AND p.status = 'spotlight' AND p.avg_rating IS NOT NULL RETURN avg(p.avg_rating) as avg_rating, count(p) as paper_count", "parameters": {{}}, "explanation": "Computing average rating for ICML spotlight papers"}}

Q: "评分最高的10篇论文是哪些？"
A: {{"cypher": "MATCH (p:Paper) WHERE p.avg_rating IS NOT NULL RETURN p.title as title, p.conference as conference, p.avg_rating as avg_rating, p.status as status ORDER BY p.avg_rating DESC LIMIT 10", "parameters": {{}}, "explanation": "Finding top 10 papers by average rating"}}

Q: "NeurIPS接收论文中评分分布如何？"
A: {{"cypher": "MATCH (p:Paper) WHERE p.conference = 'NeurIPS' AND p.status IN ['poster', 'spotlight', 'oral'] AND p.avg_rating IS NOT NULL WITH round(p.avg_rating) as rating_bucket, count(*) as count RETURN rating_bucket, count ORDER BY rating_bucket", "parameters": {{}}, "explanation": "Getting rating distribution for accepted NeurIPS papers"}}
"""

NL2CYPHER_USER_PROMPT = "Convert this question to Cypher: {question}"


# =============================================================================
# Review Summarization Prompt
# =============================================================================

REVIEW_SUMMARY_SYSTEM_PROMPT = """You are an expert at analyzing academic paper reviews.

Your task is to summarize the reviews concisely and provide actionable insights.

Guidelines:
1. Focus on the most important points
2. Be objective and balanced
3. Highlight consensus among reviewers
4. Note any disagreements or conflicting opinions
5. Use clear, professional language

Return JSON format with the following keys:
- "overall_sentiment": "positive" | "negative" | "mixed"
- "main_strengths": list of key strengths mentioned (max 5 items)
- "main_weaknesses": list of key weaknesses/concerns (max 5 items)
- "key_questions": list of important questions raised (max 5 items)
- "recommendation": brief recommendation summary
- "summary_text": comprehensive 2-3 sentence summary
"""

REVIEW_SUMMARY_USER_PROMPT = """Paper: {paper_title}

Reviews:
{reviews_text}

Please analyze and summarize these reviews."""


# =============================================================================
# Question Answering Prompt
# =============================================================================

QA_SYSTEM_PROMPT = """You are a helpful AI assistant for an academic paper database containing papers from top AI conferences (ICLR, ICML, NeurIPS 2025).

Your capabilities:
- Answer questions about papers, authors, reviews, and statistics
- Explain query results in natural language
- Provide insights and analysis based on the data

Guidelines:
1. Be concise and accurate
2. If you don't have enough information, say so clearly
3. Format your response in Markdown for readability
4. Use bullet points and tables when appropriate
5. Cite specific numbers and facts from the query results
6. Respond in the same language as the user's question (Chinese or English)
"""

QA_USER_PROMPT = """Question: {question}

Context: {context}

Query Results:
{query_results}

Please answer the question based on the above information."""


# =============================================================================
# Graph Schema Information
# =============================================================================

GRAPH_SCHEMA = """
Nodes:
- Paper: id, title, abstract, status (rejected/poster/spotlight/oral/withdrawn), conference (ICLR/ICML/NeurIPS), keywords, creation_date, forum_link, pdf_link, ratings (list of numbers), avg_rating (float), min_rating, max_rating, rating_count
- Author: authorid (unique identifier), name
- Review: id, review_type (official_review/rebuttal/decision/comment/meta_review), rating, confidence, summary, strengths, weaknesses, questions, cdate
- Keyword: name
- Conference: name, year, max_rating

Relationships:
- (Author)-[:AUTHORED {order: int}]->(Paper) - Author wrote a paper, order indicates author position
- (Paper)-[:HAS_REVIEW]->(Review) - Paper has a review/comment
- (Review)-[:REPLIES_TO]->(Review) - Review replies to another review (for rebuttals)
- (Paper)-[:HAS_KEYWORD]->(Keyword) - Paper has a keyword
- (Paper)-[:SUBMITTED_TO]->(Conference) - Paper was submitted to a conference

Important Notes:
- Accepted papers have status IN ['poster', 'spotlight', 'oral']
- Rating scales differ by conference: ICLR (1-10), ICML (1-5), NeurIPS (1-6)
- Paper nodes have pre-computed ratings: p.ratings (array), p.avg_rating, p.min_rating, p.max_rating, p.rating_count
- Use p.avg_rating directly for rating queries instead of aggregating from Review nodes
- Keywords are stored in lowercase
- authorid is the unique identifier for authors (names may have duplicates)
"""


def get_nl2cypher_prompt(question: str) -> tuple[str, str]:
    """Get the system and user prompts for NL2Cypher conversion."""
    system = NL2CYPHER_SYSTEM_PROMPT.format(schema_info=GRAPH_SCHEMA)
    user = NL2CYPHER_USER_PROMPT.format(question=question)
    return system, user


def get_review_summary_prompt(paper_title: str, reviews_text: str) -> tuple[str, str]:
    """Get the system and user prompts for review summarization."""
    system = REVIEW_SUMMARY_SYSTEM_PROMPT
    user = REVIEW_SUMMARY_USER_PROMPT.format(
        paper_title=paper_title,
        reviews_text=reviews_text
    )
    return system, user


def get_qa_prompt(question: str, context: str, query_results: str) -> tuple[str, str]:
    """Get the system and user prompts for QA."""
    system = QA_SYSTEM_PROMPT
    user = QA_USER_PROMPT.format(
        question=question,
        context=context,
        query_results=query_results
    )
    return system, user
