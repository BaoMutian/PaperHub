# PaperHub 项目规范文档

> AI Conference Papers Knowledge Graph - 基于知识图谱和LLM的AI顶会论文QA系统

## 1. 项目概述

### 1.1 项目定位
PaperHub 是一个基于 Neo4j 知识图谱和 LLM 的 AI 顶会论文智能检索与问答系统，支持 ICLR、ICML、NeurIPS 2025 论文的智能检索、分析和可视化。

### 1.2 核心功能
- **智能搜索**: 混合检索（关键词 + 语义）
- **知识图谱**: Neo4j 存储论文、作者、评审等实体及关系
- **自然语言QA**: NL2Cypher 自动转换并查询
- **评审总结**: LLM 分析评审意见生成总结
- **协作网络**: 2D/3D 作者协作关系可视化
- **数据统计**: 会议接收率、热门关键词等

### 1.3 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15, React, TailwindCSS, react-force-graph |
| 后端 | FastAPI, Python 3.11+ |
| 数据库 | Neo4j 5.x (含向量索引) |
| LLM | OpenRouter API (Gemini 2.5 Flash) |
| Embedding | sentence-transformers (Qwen3-Embedding-0.6B) |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │论文浏览  │  │作者页面  │  │协作网络  │  │ 智能问答 (QA)  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───────┬─────────┘ │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        └────────────┴────────────┴───────────────┘
                            │ HTTP/REST (localhost:8000)
┌───────────────────────────▼─────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────────┐   │
│  │ Neo4j Service│  │ LLM Service │  │ Embedding Service │   │
│  └──────┬───────┘  └──────┬──────┘  └─────────┬─────────┘   │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌───────▼───────┐
    │   Neo4j   │    │ OpenRouter  │    │ Sentence-     │
    │ + Vector  │    │    API      │    │ Transformers  │
    └───────────┘    └─────────────┘    └───────────────┘
```

---

## 3. 目录结构

```
PaperHub/
├── papers/                           # 数据集 (JSONL格式)
│   ├── iclr2025.jsonl
│   ├── icml2025.jsonl
│   ├── neurips2025.jsonl
│   └── example.json                  # 示例数据结构
│
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI 入口
│   │   ├── config.py                 # 配置管理 (Pydantic Settings)
│   │   ├── prompts.py                # LLM 提示词管理
│   │   │
│   │   ├── models/                   # Pydantic 数据模型
│   │   │   ├── paper.py              # Paper, PaperList, PaperDetail
│   │   │   ├── author.py             # Author, AuthorDetail
│   │   │   ├── review.py             # Review, ReviewSummary
│   │   │   ├── qa.py                 # QARequest, QAResponse
│   │   │   └── graph.py              # GraphNode, GraphEdge
│   │   │
│   │   ├── routers/                  # API 路由
│   │   │   ├── papers.py             # /papers/* 端点
│   │   │   ├── authors.py            # /authors/* 端点
│   │   │   ├── qa.py                 # /qa/* 端点
│   │   │   └── graph.py              # /graph/* 端点
│   │   │
│   │   ├── services/                 # 业务服务层
│   │   │   ├── neo4j_service.py      # Neo4j 数据库操作
│   │   │   ├── llm_service.py        # OpenRouter LLM 调用
│   │   │   └── embedding_service.py  # 向量嵌入生成
│   │   │
│   │   └── scripts/                  # 数据处理脚本
│   │       ├── ingest.py             # 数据导入 Neo4j
│   │       ├── create_embeddings.py  # 创建向量索引
│   │       └── add_paper_ratings.py  # 计算 Paper 评分属性
│   │
│   └── requirements.txt
│
├── frontend/                         # Next.js 前端
│   ├── src/
│   │   ├── app/                      # App Router 页面
│   │   │   ├── page.tsx              # 首页
│   │   │   ├── layout.tsx            # 根布局
│   │   │   ├── globals.css           # 全局样式
│   │   │   ├── papers/
│   │   │   │   ├── page.tsx          # 论文列表
│   │   │   │   └── [id]/page.tsx     # 论文详情
│   │   │   ├── authors/
│   │   │   │   ├── page.tsx          # 作者列表
│   │   │   │   └── [id]/page.tsx     # 作者详情
│   │   │   ├── qa/page.tsx           # 智能问答
│   │   │   ├── network/page.tsx      # 协作网络
│   │   │   └── stats/page.tsx        # 数据统计
│   │   │
│   │   ├── components/               # UI 组件
│   │   │   ├── ui/                   # 基础 UI 组件
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── markdown.tsx
│   │   │   ├── layout/
│   │   │   │   └── navbar.tsx
│   │   │   └── papers/
│   │   │       ├── paper-card.tsx
│   │   │       └── paper-filters.tsx
│   │   │
│   │   └── lib/                      # 工具函数
│   │       ├── api.ts                # API 调用封装
│   │       └── utils.ts              # 通用工具
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml                # Neo4j 容器配置
├── README.md                         # 用户文档
└── SPECIFICATION.md                  # 本规范文档
```

---

## 4. 知识图谱 Schema

### 4.1 节点类型

| 节点 | 属性 | 说明 |
|------|------|------|
| **Paper** | id, title, abstract, status, conference, keywords, creation_date, modification_date, forum_link, pdf_link, venue, primary_area, tldr, ratings (list), avg_rating, min_rating, max_rating, rating_count | 论文节点 |
| **Author** | authorid (唯一标识), name | 作者节点 |
| **Review** | id, replyto, number, cdate, mdate, review_type, rating, confidence, summary, strengths, weaknesses, questions, decision, comment, content_json | 评审节点 |
| **Keyword** | name (小写归一化) | 关键词节点 |
| **Conference** | name, year, max_rating | 会议节点 |

### 4.2 关系类型

| 关系 | 方向 | 属性 | 说明 |
|------|------|------|------|
| AUTHORED | Author → Paper | order (int) | 作者发表论文，order 表示作者顺序 |
| HAS_REVIEW | Paper → Review | - | 论文包含评审 |
| REPLIES_TO | Review → Review | - | 评审回复（rebuttal等） |
| HAS_KEYWORD | Paper → Keyword | - | 论文关键词 |
| SUBMITTED_TO | Paper → Conference | - | 论文投稿会议 |

### 4.3 Review 类型 (review_type)
- `official_review`: 官方评审
- `rebuttal`: 作者回复
- `meta_review`: AC/Meta Review
- `decision`: 最终决定
- `comment`: 普通评论
- `other`: 其他

### 4.4 评分说明
| 会议 | 满分 | 评分字段 |
|------|------|----------|
| ICLR | 10 | rating.value |
| ICML | 5 | overall_recommendation.value |
| NeurIPS | 6 | rating.value |

### 4.5 论文状态 (status)
- `poster`: 接收 (Poster)
- `spotlight`: 接收 (Spotlight)
- `oral`: 接收 (Oral)
- `rejected`: 拒稿
- `withdrawn`: 撤稿
- `desk_rejected`: 直接拒稿

---

## 5. API 规范

### 5.1 论文 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/papers` | GET | 论文列表 (分页、筛选) |
| `/papers/search` | GET | 搜索论文 (支持 mode: hybrid/semantic/keyword) |
| `/papers/stats` | GET | 统计数据 |
| `/papers/{id}` | GET | 论文详情 (含评审) |
| `/papers/{id}/review-summary` | GET | AI 评审总结 |

**搜索参数:**
- `q`: 搜索关键词
- `mode`: 搜索模式 (hybrid/semantic/keyword)，默认 hybrid
- `limit`: 返回数量

### 5.2 作者 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/authors/search` | GET | 作者搜索 |
| `/authors/top` | GET | 高产作者排行 |
| `/authors/{authorid}` | GET | 作者详情 |

### 5.3 图可视化 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/graph/collaboration-network` | GET | 协作网络 |
| `/graph/author-ego-network/{authorid}` | GET | 作者自我网络 |

### 5.4 智能问答 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/qa/ask` | POST | 自然语言问答 |
| `/qa/semantic-search` | POST | 语义搜索 |
| `/qa/examples` | GET | 示例问题 |

**QA 请求体:**
```json
{
  "question": "string",
  "include_sources": true
}
```

**QA 响应体:**
```json
{
  "answer": "string",
  "cypher_query": "string | null",
  "raw_results": "array | null",
  "sources": [],
  "confidence": 0.8,
  "query_type": "stats | search | comparison | summary"
}
```

---

## 6. 前端组件规范

### 6.1 Review 动态渲染

`DynamicReviewContent` 组件根据 `review.content` 动态渲染所有字段：

**字段优先级排序:**
1. decision (决定)
2. metareview (Meta Review)
3. summary (摘要)
4. strengths 类字段
5. weaknesses 类字段
6. questions 类字段
7. 评分类字段
8. 评论类字段
9. 技术细节
10. 伦理相关

**跳过的字段:**
- title, code_of_conduct, mandatory_acknowledgement 等确认性字段

### 6.2 评分显示

论文卡片和详情页的评分显示格式: `{avg_rating}/{max_rating}`

根据会议自动匹配满分:
- ICLR: /10
- ICML: /5
- NeurIPS: /6

### 6.3 QA 调试面板

问答页面支持:
- 查看 Cypher 查询语句
- 查看数据库返回的原始结果 (JSON)

---

## 7. 数据处理脚本

### 7.1 数据导入 (ingest.py)

```bash
cd backend
python -m app.scripts.ingest
```

功能:
- 解析 JSONL 文件
- 创建 Paper/Author/Review/Keyword/Conference 节点
- 创建所有关系
- 保存 Review 的完整 content_json

### 7.2 向量索引 (create_embeddings.py)

```bash
python -m app.scripts.create_embeddings
```

功能:
- 为 Paper.abstract 创建向量嵌入
- 创建 Neo4j 向量索引

### 7.3 评分属性更新 (add_paper_ratings.py)

```bash
python -m app.scripts.add_paper_ratings
```

功能:
- 聚合每篇论文的 official_review 评分
- 更新 Paper 节点: ratings, avg_rating, min_rating, max_rating, rating_count
- 创建 paper_avg_rating 索引

---

## 8. 配置管理

### 8.1 环境变量

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# OpenRouter LLM
OPENROUTER_API_KEY=your-api-key
LLM_MODEL=google/gemini-2.5-flash

# Embedding
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
```

### 8.2 前端配置

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 9. NL2Cypher 提示词规范

### 9.1 Schema 描述要点

- Paper 节点包含预计算的评分属性: ratings, avg_rating, min_rating, max_rating
- 查询评分时优先使用 Paper.avg_rating，无需 JOIN Review
- 会议名称精确匹配: 'ICLR', 'ICML', 'NeurIPS'
- 接收状态: status IN ['poster', 'spotlight', 'oral']
- 关键词小写存储

### 9.2 示例查询覆盖场景

1. 统计查询 (count, 接收率)
2. 评分查询 (平均分, 分布)
3. 作者查询 (高产作者, 跨会议)
4. 关键词查询 (热门关键词)
5. 论文搜索 (标题, 关键词)

---

## 10. 扩展指南

### 10.1 添加新会议

1. 在 `backend/app/scripts/ingest.py` 的 `CONFERENCE_CONFIG` 添加配置
2. 准备 JSONL 数据文件到 `papers/` 目录
3. 运行 `python -m app.scripts.ingest`
4. 运行 `python -m app.scripts.add_paper_ratings`

### 10.2 添加新 Review 字段

1. 前端 `FIELD_CONFIG` 添加字段配置 (可选，未配置字段自动处理)
2. 后端已自动保存完整 content_json，无需修改

### 10.3 修改 NL2Cypher 行为

1. 编辑 `backend/app/prompts.py` 中的:
   - `GRAPH_SCHEMA`: 更新 Schema 描述
   - `NL2CYPHER_SYSTEM_PROMPT`: 更新规则和示例

---

## 11. 部署检查清单

- [ ] Neo4j 容器运行中 (`docker-compose up -d`)
- [ ] 数据已导入 (`python -m app.scripts.ingest`)
- [ ] 向量索引已创建 (`python -m app.scripts.create_embeddings`)
- [ ] Paper 评分已更新 (`python -m app.scripts.add_paper_ratings`)
- [ ] 后端启动 (`uvicorn app.main:app --reload`)
- [ ] 前端启动 (`npm run dev`)
- [ ] 环境变量配置正确

---

## 12. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2024-12 | 初始版本：基础论文浏览、作者网络、QA |
| 1.1.0 | 2024-12 | Review动态渲染、混合检索、Paper评分属性、QA调试面板 |

---

*本规范文档应随项目更新同步维护*

