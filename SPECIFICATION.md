# PaperHub 项目规范文档

> AI Conference Papers Knowledge Graph - 基于知识图谱和 LLM 的 AI 顶会论文 QA 系统

## 1. 项目概述

### 1.1 项目定位

PaperHub 是一个基于 Neo4j 知识图谱和 LLM 的 AI 顶会论文智能检索与问答系统，支持 ICLR、ICML、NeurIPS 2025 论文的智能检索、分析和可视化。

### 1.2 核心功能

- **智能搜索**: 混合检索（关键词 + 语义）
- **知识图谱**: Neo4j 存储论文、作者、评审等实体及关系
- **自然语言 QA**: NL2Cypher 自动转换并查询
- **评审总结**: LLM 分析评审意见生成总结
- **协作网络**: 2D/3D 作者协作关系可视化
- **数据统计**: 会议接收率、热门关键词等

### 1.3 技术栈

| 层级      | 技术                                                           |
| --------- | -------------------------------------------------------------- |
| 前端      | Next.js 16, React 19, TailwindCSS, Recharts, react-force-graph |
| 后端      | FastAPI, Python 3.11+                                          |
| 数据库    | Neo4j 5.x (含向量索引)                                         |
| LLM       | OpenRouter API (Gemini 2.5 Flash)                              |
| Embedding | sentence-transformers (all-MiniLM-L6-v2 / Qwen3)               |
| 部署      | Docker, Docker Compose                                         |
| 数据集    | Hugging Face (SkyyyyyMT/paperhub_data)                         |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
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
├── papers/                           # 数据集 (从 HuggingFace 下载)
│   ├── iclr2025.jsonl
│   ├── icml2025.jsonl
│   └── neurips2025.jsonl
│
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI 入口 (含模型预热)
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
│   │   │   └── embedding_service.py  # 向量嵌入生成 (单例+预热)
│   │   │
│   │   └── scripts/                  # 数据处理脚本
│   │       ├── ingest.py             # 数据导入 (含互动统计计算)
│   │       └── create_embeddings.py  # 创建向量索引
│   │
│   ├── Dockerfile                    # 后端容器配置
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
│   │   │   │   └── [id]/page.tsx     # 论文详情 (含 BattleBar)
│   │   │   ├── authors/
│   │   │   │   ├── page.tsx          # 作者列表
│   │   │   │   └── [id]/page.tsx     # 作者详情
│   │   │   ├── qa/page.tsx           # 智能问答
│   │   │   ├── network/page.tsx      # 协作网络
│   │   │   └── stats/page.tsx        # 数据统计 (Recharts)
│   │   │
│   │   ├── components/               # UI 组件
│   │   │   ├── ui/                   # 基础 UI 组件
│   │   │   └── layout/
│   │   │       └── navbar.tsx
│   │   │
│   │   └── lib/                      # 工具函数
│   │       ├── api.ts                # API 调用封装
│   │       └── utils.ts              # 通用工具
│   │
│   ├── Dockerfile                    # 前端容器配置
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml                # 开发环境 (Neo4j)
├── docker-compose.prod.yml           # 生产环境 (全栈)
├── deploy.sh                         # 一键部署脚本
├── README.md                         # 用户文档
└── SPECIFICATION.md                  # 本规范文档
```

---

## 4. 知识图谱 Schema

### 4.1 节点类型

| 节点           | 属性                                                                                                                                                                                                                                                                                                 | 说明       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Paper**      | id, title, abstract, status, conference, keywords, creation_date, modification_date, forum_link, pdf_link, venue, primary_area, tldr, ratings (list), avg_rating, min_rating, max_rating, rating_count, **author_word_count**, **reviewer_word_count**, **interaction_rounds**, **battle_intensity** | 论文节点   |
| **Author**     | authorid (唯一标识), name                                                                                                                                                                                                                                                                            | 作者节点   |
| **Review**     | id, replyto, number, cdate, mdate, review_type, rating, confidence, summary, strengths, weaknesses, questions, decision, comment, content_json                                                                                                                                                       | 评审节点   |
| **Keyword**    | name (小写归一化)                                                                                                                                                                                                                                                                                    | 关键词节点 |
| **Conference** | name, year, max_rating                                                                                                                                                                                                                                                                               | 会议节点   |

### 4.6 Interaction 统计属性 (Paper 节点)

| 属性                | 类型            | 说明                         |
| ------------------- | --------------- | ---------------------------- |
| author_word_count   | Integer         | 作者在 Rebuttal 阶段的总字数 |
| reviewer_word_count | Integer         | 所有审稿人回复的总字数       |
| interaction_rounds  | Integer         | 最大对话回复层级深度         |
| battle_intensity    | Float (0.0-1.0) | 归一化的讨论激烈程度指数     |

**battle_intensity 计算因子:**

- 总字数 (word_factor): 35%
- 对话深度 (depth_factor): 30%
- 评审数量 (review_factor): 20%
- 双方平衡度 (balance_factor): 15%

### 4.2 关系类型

| 关系         | 方向               | 属性        | 说明                             |
| ------------ | ------------------ | ----------- | -------------------------------- |
| AUTHORED     | Author → Paper     | order (int) | 作者发表论文，order 表示作者顺序 |
| HAS_REVIEW   | Paper → Review     | -           | 论文包含评审                     |
| REPLIES_TO   | Review → Review    | -           | 评审回复（rebuttal 等）          |
| HAS_KEYWORD  | Paper → Keyword    | -           | 论文关键词                       |
| SUBMITTED_TO | Paper → Conference | -           | 论文投稿会议                     |

### 4.3 Review 类型 (review_type)

- `official_review`: 官方评审
- `rebuttal`: 作者回复
- `meta_review`: AC/Meta Review
- `decision`: 最终决定
- `comment`: 普通评论
- `other`: 其他

### 4.4 评分说明

| 会议    | 满分 | 评分字段                     |
| ------- | ---- | ---------------------------- |
| ICLR    | 10   | rating.value                 |
| ICML    | 5    | overall_recommendation.value |
| NeurIPS | 6    | rating.value                 |

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

| 端点                          | 方法 | 说明                                          |
| ----------------------------- | ---- | --------------------------------------------- |
| `/papers`                     | GET  | 论文列表 (分页、筛选)                         |
| `/papers/search`              | GET  | 搜索论文 (支持 mode: hybrid/semantic/keyword) |
| `/papers/trending`            | GET  | 讨论最激烈的论文 (按 interaction_rounds 排序) |
| `/papers/top-rated`           | GET  | 高分论文 (按 avg_rating 排序)                 |
| `/papers/stats`               | GET  | 统计数据                                      |
| `/papers/{id}`                | GET  | 论文详情 (含评审、interaction 统计)           |
| `/papers/{id}/review-summary` | GET  | AI 评审总结                                   |

**搜索参数:**

- `q`: 搜索关键词
- `mode`: 搜索模式 (hybrid/semantic/keyword)，默认 hybrid
- `limit`: 返回数量

### 5.2 作者 API

| 端点                  | 方法 | 说明         |
| --------------------- | ---- | ------------ |
| `/authors/search`     | GET  | 作者搜索     |
| `/authors/top`        | GET  | 高产作者排行 |
| `/authors/{authorid}` | GET  | 作者详情     |

### 5.3 图可视化 API

| 端点                                   | 方法 | 说明         |
| -------------------------------------- | ---- | ------------ |
| `/graph/collaboration-network`         | GET  | 协作网络     |
| `/graph/author-ego-network/{authorid}` | GET  | 作者自我网络 |

### 5.4 智能问答 API

| 端点                  | 方法 | 说明         |
| --------------------- | ---- | ------------ |
| `/qa/ask`             | POST | 自然语言问答 |
| `/qa/semantic-search` | POST | 语义搜索     |
| `/qa/examples`        | GET  | 示例问题     |

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

### 6.4 Battle Bar (Rebuttal 对抗条)

论文详情页展示作者与审稿人的"对战"统计，格斗游戏血条风格：

- 左侧绿色: Author Defense (作者字数)
- 右侧红色: Reviewer Pushback (审稿人字数)
- 中间 VS 分隔符
- 状态文案: 根据字数比例动态显示
  - 作者字数 > 审稿人 2 倍: "作者强势回应"
  - 审稿人字数 > 作者 2 倍: "审稿人穷追猛打"
  - 差距在 20% 以内: "激烈交锋"
  - 总字数较少: "平稳讨论"

### 6.5 豆瓣风格状态徽章 (StatusBadge)

为接受论文提供醒目的视觉标识：

| Status      | 样式         | 图标          |
| ----------- | ------------ | ------------- |
| `oral`      | 金色渐变背景 | Trophy (奖杯) |
| `spotlight` | 紫色渐变背景 | Zap (闪电)    |
| `poster`    | 蓝色渐变背景 | Pin (图钉)    |

组件位置: `frontend/src/components/ui/status-badge.tsx`

### 6.6 首页推荐区块

首页默认展示两个推荐区块：

- **讨论最激烈 (Trending)**: 按 interaction_rounds 排序，显示 battle_intensity 百分比
- **高分佳作 (Top Rated)**: 按 avg_rating 排序，显示金银铜排名徽章

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
- 聚合评分属性 (avg_rating, min_rating, max_rating)
- **自动计算互动统计** (author_word_count, reviewer_word_count, interaction_rounds, battle_intensity)

### 7.2 向量索引 (create_embeddings.py)

```bash
python -m app.scripts.create_embeddings
```

功能:

- 为 Paper.abstract 创建向量嵌入
- 创建 Neo4j 向量索引
- 支持增量更新（跳过已有嵌入的论文）

---

## 8. 配置管理

### 8.1 环境变量

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# OpenRouter LLM (API key 必须通过环境变量设置，不能硬编码)
OPENROUTER_API_KEY=your-api-key  # 可选，用于智能问答
LLM_MODEL=google/gemini-2.5-flash

# Embedding (根据服务器配置选择)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2  # CPU 推荐
# EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B             # GPU 推荐
EMBEDDING_DIMENSION=384  # all-MiniLM: 384, Qwen3: 1024
```

### 8.2 嵌入模型选择

| 模型                        | 维度 | 大小   | 速度 | 适用场景           |
| --------------------------- | ---- | ------ | ---- | ------------------ |
| `all-MiniLM-L6-v2`          | 384  | ~23MB  | 快   | CPU 服务器（默认） |
| `Qwen/Qwen3-Embedding-0.6B` | 1024 | ~1.2GB | 慢   | GPU 服务器         |

> **注意**: 模型在启动时预热，避免首次搜索延迟。

### 8.3 前端配置

```bash
# 本地开发
NEXT_PUBLIC_API_URL=http://localhost:8000

# 生产部署
NEXT_PUBLIC_API_URL=http://你的服务器IP:8000
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
3. 运行 `python -m app.scripts.ingest` (自动计算评分和互动统计)

### 10.2 添加新 Review 字段

1. 前端 `FIELD_CONFIG` 添加字段配置 (可选，未配置字段自动处理)
2. 后端已自动保存完整 content_json，无需修改

### 10.3 修改 NL2Cypher 行为

1. 编辑 `backend/app/prompts.py` 中的:
   - `GRAPH_SCHEMA`: 更新 Schema 描述
   - `NL2CYPHER_SYSTEM_PROMPT`: 更新规则和示例

### 10.4 更换嵌入模型

1. 修改 `backend/app/config.py` 中的 `embedding_model` 和 `embedding_dimension`
2. 重新运行 `python -m app.scripts.create_embeddings`
3. 注意：更换模型需要重建所有向量索引

---

## 11. 部署检查清单

### 11.1 Docker 一键部署

```bash
export SERVER_IP=你的服务器IP
export OPENROUTER_API_KEY=你的API密钥  # 可选
./deploy.sh
docker exec -it paperhub-backend python -m app.scripts.ingest
docker exec -it paperhub-backend python -m app.scripts.create_embeddings  # 可选
```

### 11.2 本地开发环境

- [ ] 数据集已下载 (从 HuggingFace: SkyyyyyMT/paperhub_data)
- [ ] Neo4j 容器运行中 (`docker-compose up -d`)
- [ ] 数据已导入 (`python -m app.scripts.ingest`) - 自动计算互动统计
- [ ] 向量索引已创建 (`python -m app.scripts.create_embeddings`) - 可选
- [ ] 后端启动 (`uvicorn app.main:app --host 0.0.0.0 --port 8000`)
- [ ] 前端启动 (`npm run dev`)
- [ ] 环境变量配置正确 (`.env` 和 `.env.local`)

---

## 12. 版本历史

| 版本  | 日期    | 更新内容                                                             |
| ----- | ------- | -------------------------------------------------------------------- |
| 1.0.0 | 2025-12 | 初始版本：基础论文浏览、作者网络、QA                                 |
| 1.1.0 | 2025-12 | Review 动态渲染、混合检索、Paper 评分属性、QA 调试面板               |
| 1.2.0 | 2025-12 | Rebuttal 互动统计、Battle Bar、豆瓣风格徽章、首页 Trending/TopRated  |
| 1.3.0 | 2025-12 | 数据统计页面升级(recharts 图表)、热门关键词语义去重、高产作者排行    |
| 1.3.1 | 2025-12 | UI 优化：新 Logo、BattleBar 光效动画、QA 页面布局优化                |
| 1.4.0 | 2025-12 | Docker 生产部署、嵌入模型 CPU 优化、数据集托管 HuggingFace、脚本整合 |

---

_本规范文档应随项目更新同步维护_
