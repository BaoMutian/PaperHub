---
name: KG论文QA系统优化
overview: 针对论文QA系统进行5项核心功能优化：修复Review动态字段渲染、添加评分满分显示、实现混合检索、增强知识图谱评分能力、完善QA调试信息展示。
todos:
  - id: review-content-backend
    content: "后端: ingest保存完整review content, API返回content字段"
    status: completed
  - id: review-content-frontend
    content: "前端: 实现动态Review字段渲染组件, 支持所有会议字段"
    status: completed
    dependencies:
      - review-content-backend
  - id: rating-display
    content: "论文卡片: 评分显示添加满分参考 (如 8.5/10)"
    status: completed
  - id: hybrid-search
    content: "后端: 实现混合检索 (关键词+语义+作者匹配)"
    status: completed
  - id: paper-ratings-script
    content: "新建脚本: 为Paper节点计算并存储ratings数组和avg_rating"
    status: completed
  - id: update-prompts
    content: "更新prompts.py: Schema添加Paper评分属性, 优化NL2Cypher示例"
    status: completed
    dependencies:
      - paper-ratings-script
  - id: qa-debug-panel
    content: "前端QA页面: 添加可折叠的查询结果调试面板"
    status: completed
---

# KG论文QA系统功能优化计划

## 问题分析

### 1. Review内容渲染问题

当前 [`frontend/src/app/papers/[id]/page.tsx`](frontend/src/app/papers/[id]/page.tsx) 中的 `ReviewItem` 组件只硬编码渲染了固定字段(summary/strengths/weaknesses/questions/comment/decision)，但不同会议有大量不同字段。

**方案**: 将 `review.content` (包含所有原始字段) 从后端传递到前端，前端动态渲染所有字段。需要：

- 后端 ingest 时保存完整 content 到 Review 节点
- 后端 API 返回 content 字段
- 前端实现通用的字段渲染组件，按字段类型分类显示

### 2. 论文卡片评分满分显示

当前 [`frontend/src/components/papers/paper-card.tsx`](frontend/src/components/papers/paper-card.tsx) 只显示评分数值，未显示满分。

**方案**: 根据 `paper.conference` 显示对应满分 (ICLR/10, ICML/5, NeurIPS/6)。

### 3. 搜索机制改进

当前 [`backend/app/services/neo4j_service.py`](backend/app/services/neo4j_service.py) 中 `search_papers_text` 仅用 CONTAINS 匹配标题和摘要。

**方案**: 实现混合检索:

- 关键词搜索: 匹配标题(高权重)、作者名、关键词
- 语义搜索: 向量相似度
- 融合排序: 关键词精确匹配优先，语义搜索补充

### 4. 知识图谱评分增强

当前 Paper 节点没有 ratings 属性，只能通过 JOIN Review 节点获取评分，影响 LLM 生成 Cypher 查询的效率和准确性。

**方案**:

- 编写数据处理脚本，为每篇论文计算 ratings 数组和 avg_rating
- 更新 ingest 脚本，在导入时直接计算并存储
- 更新 prompts.py 中的 schema 描述
- 更新 NL2Cypher 示例查询

### 5. QA调试信息展示

后端已返回 `cypher_query` 和 `raw_results`，但前端只显示 cypher，未显示查询结果。

**方案**: 前端 QA 页面添加可折叠的"查询结果"面板，展示 JSON 格式的 raw_results。

---

## 实施步骤

### 步骤 1: 修改 Review 数据存储和传递

**后端修改**:

- [`backend/app/scripts/ingest.py`](backend/app/scripts/ingest.py): Review 节点保存完整 content (JSON 字符串)
- [`backend/app/services/neo4j_service.py`](backend/app/services/neo4j_service.py): `get_paper_by_id` 返回 review.content
- [`backend/app/models/review.py`](backend/app/models/review.py): Review 模型添加 `content: Dict[str, Any]`

**前端修改**:

- [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts): Review 接口添加 content 字段
- [`frontend/src/app/papers/[id]/page.tsx`](frontend/src/app/papers/[id]/page.tsx): 实现 `DynamicReviewContent` 组件，按字段分类动态渲染

### 步骤 2: 论文卡片添加满分显示

修改 [`frontend/src/components/papers/paper-card.tsx`](frontend/src/components/papers/paper-card.tsx):

```tsx
// 显示格式: 8.5/10
<span>{paper.avg_rating.toFixed(1)}/{getMaxRating(paper.conference)}</span>
```

### 步骤 3: 实现混合检索

修改 [`backend/app/services/neo4j_service.py`](backend/app/services/neo4j_service.py):

```python
async def search_papers_hybrid(self, query: str, embedding: List[float], limit: int):
    # 1. 关键词搜索 (标题精确匹配高分)
    # 2. 语义搜索
    # 3. 融合排序: RRF (Reciprocal Rank Fusion)
```

修改 [`backend/app/routers/papers.py`](backend/app/routers/papers.py): search 端点使用混合检索

### 步骤 4: Paper 节点添加评分属性

新建脚本 [`backend/app/scripts/add_paper_ratings.py`](backend/app/scripts/add_paper_ratings.py):

- 从 Review 节点聚合每篇论文的 ratings 数组
- 计算 avg_rating, max_rating, min_rating
- 更新 Paper 节点

修改 [`backend/app/prompts.py`](backend/app/prompts.py):

- GRAPH_SCHEMA 添加 Paper.ratings, Paper.avg_rating 属性
- 添加评分查询示例

### 步骤 5: QA调试信息完善

修改 [`frontend/src/app/qa/page.tsx`](frontend/src/app/qa/page.tsx):

- 添加"查看查询结果"按钮
- 可折叠展示 raw_results JSON