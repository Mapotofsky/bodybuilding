# P2 详细设计文档 — Wiki 社区

> **版本**：v1.0 &ensp;|&ensp; **日期**：2026-03-28 &ensp;|&ensp; **状态**：待开发
>
> **范围**：M3 动作/器械 Wiki 模块（编辑、评论、热度排行、版本历史、审核）
>
> **前置依赖**：P0（用户鉴权 + 动作库）、P1（动作详情页）

---

## 1 模块概述

将 P0/P1 的只读动作库升级为社区化 Wiki 知识库：

- Wiki 条目的 Markdown 编辑与版本历史
- 楼中楼评论系统（支持点赞、举报）
- 浏览量/点赞量/评论量驱动的热度排行
- 管理员审核机制
- 肌群可视化（前端人体肌群图）

---

## 2 数据库设计

### 2.1 新增表

#### 2.1.1 wiki_articles

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 自增主键 |
| slug | VARCHAR(150) | UNIQUE, NOT NULL, INDEX | URL 友好标识 |
| title | VARCHAR(200) | NOT NULL | 条目标题 |
| type | ENUM(exercise, equipment) | NOT NULL | 条目类型 |
| category | VARCHAR(50) | NOT NULL | 分类（chest, back, legs...） |
| content_md | TEXT | NOT NULL | Markdown 正文 |
| target_muscles | JSONB | DEFAULT '[]' | 主要目标肌群 ID 列表 |
| secondary_muscles | JSONB | DEFAULT '[]' | 次要参与肌群 ID 列表 |
| met_value | FLOAT | NULLABLE | MET 值 |
| difficulty | INT | NULLABLE | 难度 1-5 |
| media | JSONB | DEFAULT '[]' | 图片/GIF/视频链接列表 |
| view_count | INT | DEFAULT 0 | 浏览量 |
| like_count | INT | DEFAULT 0 | 点赞量 |
| comment_count | INT | DEFAULT 0 | 评论量 |
| status | ENUM(draft, published, archived) | DEFAULT 'published' | 状态 |
| author_id | INT | FK → users.id, NOT NULL | 作者 |
| exercise_id | INT | FK → exercises.id, NULLABLE | 关联的动作库条目 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新时间 |

**索引**：

- `ix_wiki_articles_slug (slug)` — UNIQUE
- `ix_wiki_articles_category (category)`
- GIN 索引 `ix_wiki_articles_fts` on `to_tsvector('simple', title || ' ' || content_md)` — 全文搜索

#### 2.1.2 wiki_revisions

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 自增主键 |
| article_id | INT | FK → wiki_articles.id (CASCADE), NOT NULL | 所属条目 |
| author_id | INT | FK → users.id, NOT NULL | 编辑者 |
| content_md | TEXT | NOT NULL | 该版本的完整 Markdown 内容 |
| edit_summary | VARCHAR(200) | NULLABLE | 编辑摘要 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |

**索引**：`ix_wiki_revisions_article (article_id, created_at DESC)`

#### 2.1.3 wiki_comments

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 自增主键 |
| article_id | INT | FK → wiki_articles.id (CASCADE), NOT NULL | 所属条目 |
| user_id | INT | FK → users.id, NOT NULL | 评论者 |
| parent_id | INT | FK → wiki_comments.id, NULLABLE | 父评论（楼中楼） |
| content | TEXT | NOT NULL | 评论内容 |
| like_count | INT | DEFAULT 0 | 点赞数 |
| is_hidden | BOOLEAN | DEFAULT false | 是否被管理员隐藏 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |

**索引**：`ix_wiki_comments_article (article_id, created_at)`

#### 2.1.4 wiki_likes

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 自增主键 |
| user_id | INT | NOT NULL | 用户 |
| target_type | ENUM(article, comment) | NOT NULL | 点赞对象类型 |
| target_id | INT | NOT NULL | 点赞对象 ID |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |

**约束**：`UNIQUE (user_id, target_type, target_id)` — 防止重复点赞

#### 2.1.5 wiki_reports

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 自增主键 |
| user_id | INT | FK → users.id, NOT NULL | 举报者 |
| target_type | ENUM(article, comment) | NOT NULL | 举报对象类型 |
| target_id | INT | NOT NULL | 举报对象 ID |
| reason | VARCHAR(500) | NOT NULL | 举报原因 |
| status | ENUM(pending, resolved, rejected) | DEFAULT 'pending' | 处理状态 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |

### 2.2 已有表关联

- `wiki_articles.exercise_id` → `exercises.id`：将 Wiki 条目与 P0 动作库关联
- 初始化时为每个预置动作自动创建对应的 Wiki 条目（seed 脚本）

### 2.3 ER 关系

```
WikiArticle (1) ──→ (N) WikiRevision
WikiArticle (1) ──→ (N) WikiComment (self-ref: parent_id)
WikiArticle (1) ──→ (N) WikiLike (target_type='article')
WikiComment (1) ──→ (N) WikiLike (target_type='comment')
WikiArticle / WikiComment ──→ (N) WikiReport
User (1) ──→ (N) WikiArticle (author)
User (1) ──→ (N) WikiComment
User (1) ──→ (N) WikiLike
```

---

## 3 后端 API 设计

### 3.1 Wiki 条目 (`/wiki/articles`)

#### GET /api/v1/wiki/articles

搜索/浏览 Wiki 条目。

**查询参数**：

- `type?: "exercise" | "equipment"`
- `category?: str`
- `q?: str`（全文搜索关键词）
- `page?: int` (default=1)
- `size?: int` (default=20)

**响应 200**：

```json
{
  "total": 52,
  "page": 1,
  "size": 20,
  "items": [
    {
      "id": 1,
      "slug": "ping-ban-gang-ling-wo-tui",
      "title": "平板杠铃卧推",
      "type": "exercise",
      "category": "chest",
      "target_muscles": ["pectoralis_major"],
      "difficulty": 3,
      "view_count": 1205,
      "like_count": 89,
      "comment_count": 12,
      "status": "published",
      "author_nickname": "系统",
      "updated_at": "..."
    }
  ]
}
```

**全文搜索实现**：

```sql
SELECT * FROM wiki_articles
WHERE to_tsvector('simple', title || ' ' || content_md) @@ plainto_tsquery('simple', :q)
  AND status = 'published'
ORDER BY ts_rank(...) DESC
```

#### GET /api/v1/wiki/articles/{slug}

获取条目详情。

**响应 200**：`WikiArticleOut`（含完整 content_md、author 信息）

**副作用**：view_count += 1（异步更新，不阻塞响应）

#### POST /api/v1/wiki/articles

新建条目。

**请求**：

```json
{
  "title": "哈克深蹲",
  "type": "exercise",
  "category": "legs",
  "content_md": "## 动作描述\n...",
  "target_muscles": ["quadriceps"],
  "secondary_muscles": ["glutes"],
  "met_value": 5.5,
  "difficulty": 3,
  "media": []
}
```

**逻辑**：

1. 自动生成 slug（中文拼音转换或 title hash）
2. 创建 WikiArticle
3. 创建第一条 WikiRevision
4. 管理员直接发布，普通用户设为 draft 待审核

#### PUT /api/v1/wiki/articles/{slug}

编辑条目。

**请求**：`{ content_md, edit_summary?, target_muscles?, ... }`

**逻辑**：

1. 更新 WikiArticle 内容
2. 创建新的 WikiRevision 记录
3. 非管理员编辑后状态改为 draft 待审核

#### GET /api/v1/wiki/articles/{slug}/revisions

获取版本历史列表。

**响应 200**：`{ id, author_nickname, edit_summary, created_at }[]`

### 3.2 评论 (`/wiki/articles/{slug}/comments`)

#### GET /api/v1/wiki/articles/{slug}/comments

获取评论列表（分页，按时间正序，楼中楼嵌套）。

**查询参数**：`page?: int`, `size?: int`

**响应 200**：

```json
{
  "total": 12,
  "page": 1,
  "size": 20,
  "items": [
    {
      "id": 1,
      "user_id": 5,
      "user_nickname": "张三",
      "content": "这个动作需要注意肩胛骨的收紧",
      "like_count": 3,
      "is_liked": false,
      "parent_id": null,
      "replies": [
        {
          "id": 3,
          "user_id": 8,
          "user_nickname": "李四",
          "content": "同意，我之前肩膀受伤就是因为没注意这个",
          "like_count": 1,
          "is_liked": false,
          "parent_id": 1,
          "created_at": "..."
        }
      ],
      "created_at": "..."
    }
  ]
}
```

#### POST /api/v1/wiki/articles/{slug}/comments

发表评论。

**请求**：`{ content: str, parent_id?: int }`

**逻辑**：创建评论 → wiki_articles.comment_count += 1

#### DELETE /api/v1/wiki/articles/{slug}/comments/{comment_id}

删除评论（仅作者或管理员可操作）。

### 3.3 点赞 (`/wiki/articles/{slug}/like`)

#### POST /api/v1/wiki/articles/{slug}/like

切换点赞状态（toggle）。

**逻辑**：

- 若未点赞：插入 wiki_likes，wiki_articles.like_count += 1
- 若已点赞：删除 wiki_likes，wiki_articles.like_count -= 1

**响应 200**：`{ liked: boolean, like_count: int }`

#### POST /api/v1/wiki/comments/{comment_id}/like

切换评论点赞状态（toggle）。

### 3.4 热度排行 (`/wiki/ranking`)

#### GET /api/v1/wiki/ranking

**查询参数**：

- `period?: "week" | "month" | "all"` (default="week")
- `sort?: "views" | "likes" | "comments" | "score"` (default="score")
- `size?: int` (default=20)

**响应 200**：`WikiArticleSummary[]`

**热度分计算**（SQL 实现）：

```sql
SELECT *,
  (0.4 * view_count_norm + 0.35 * like_count_norm + 0.25 * comment_count_norm)
  * exp(-0.05 * EXTRACT(DAY FROM now() - updated_at))
  AS score
FROM wiki_articles
WHERE status = 'published'
ORDER BY score DESC
LIMIT :size
```

应用层使用 `functools.lru_cache` 或 `cachetools.TTLCache`（TTL=1小时）缓存排行结果。

### 3.5 举报 (`/wiki/reports`)

#### POST /api/v1/wiki/reports

**请求**：`{ target_type: "article" | "comment", target_id: int, reason: str }`

**响应 201**：`{ id, status: "pending" }`

---

## 4 后端新增文件

| 文件 | 说明 |
|------|------|
| `app/models/wiki.py` | WikiArticle, WikiRevision, WikiComment, WikiLike, WikiReport |
| `app/schemas/wiki.py` | 全套 schemas |
| `app/api/v1/wiki.py` | Wiki 路由（条目 CRUD、评论、点赞、排行、举报） |
| `app/services/wiki_seed.py` | 为预置动作生成初始 Wiki 条目 |
| `app/services/slug.py` | 中文标题 → slug 转换（pypinyin 或简单 hash） |

---

## 5 前端设计

### 5.1 新增路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/wiki` | WikiListPage | Wiki 条目列表（搜索、分类筛选、排行） |
| `/wiki/:slug` | WikiArticlePage | 条目详情（Markdown 渲染、评论、点赞） |
| `/wiki/:slug/edit` | WikiEditPage | 编辑条目（Markdown 编辑器） |
| `/wiki/:slug/history` | WikiHistoryPage | 版本历史 |
| `/wiki/new` | WikiCreatePage | 新建条目 |

### 5.2 底部导航更新

> **设计说明**：P1 实现后底部导航已有 4 项（首页 / 计划 / 训练 / 我的）。P2 和 P3 都需要新增 Tab，但移动端导航项目不宜超过 5 项。
>
> **当前建议**：P2 实现时将"百科"加为第 5 项（替换或整合进"我的"），P3 实现时评估"统计"与"百科"谁作为独立 Tab、谁降级为二级入口（参见 P3 文档 5.2 节的冲突说明）。两个阶段同时实现时需统一协商最终导航结构。

P2 阶段导航（仅供参考，最终需与 P3 协调）：

| 图标 | 标签 | 路径 |
|------|------|------|
| Home | 首页 | `/` |
| ClipboardList | 计划 | `/plans` |
| Dumbbell | 训练 | `/workouts` |
| BookOpen | 百科 | `/wiki` |
| User | 我的 | `/profile` |

### 5.3 新增 npm 依赖

| 包 | 用途 |
|---|------|
| `react-markdown` | Markdown 渲染 |
| `remark-gfm` | 支持 GFM 语法（表格、任务列表） |
| `react-textarea-autosize` | 编辑器自适应高度 |

### 5.4 新增前端服务

`services/wiki.ts`：

```typescript
getArticles(params): Promise<PaginatedResponse<WikiArticleSummary>>
getArticle(slug: string): Promise<WikiArticleOut>
createArticle(body): Promise<WikiArticleOut>
updateArticle(slug: string, body): Promise<WikiArticleOut>
getRevisions(slug: string): Promise<WikiRevision[]>
getComments(slug: string, params): Promise<PaginatedResponse<WikiComment>>
postComment(slug: string, body): Promise<WikiComment>
deleteComment(slug: string, commentId: number): Promise<void>
toggleArticleLike(slug: string): Promise<{ liked: boolean; like_count: number }>
toggleCommentLike(commentId: number): Promise<{ liked: boolean; like_count: number }>
getRanking(params): Promise<WikiArticleSummary[]>
report(body): Promise<void>
```

### 5.5 页面详细设计

#### 5.5.1 WikiListPage

- 顶部搜索栏（实时搜索，防抖 300ms）
- 分类 Tab 筛选（全部/胸/背/腿/肩/臂/核心/有氧/器械）
- 排行模式切换（周榜/月榜/总榜）
- 条目卡片列表：标题、分类标签、浏览/点赞/评论计数、难度星级
- FAB "+" 新建条目

#### 5.5.2 WikiArticlePage

- 标题 + 分类标签 + 作者 + 更新时间
- 目标肌群可视化：人体肌群图（SVG），高亮主要/次要肌群
- Markdown 正文渲染（react-markdown + remark-gfm）
- 媒体展示区（图片轮播 / 嵌入视频）
- 浏览/点赞/评论计数栏 + 点赞按钮
- 评论区：
  - 评论列表（楼中楼缩进展示）
  - 每条评论：头像、昵称、内容、时间、点赞按钮、回复按钮、举报
  - 评论输入框（固定底部）
- 操作按钮：编辑 / 查看版本历史 / 举报

#### 5.5.3 WikiEditPage

- 标题输入
- 分类选择
- 目标肌群多选
- Markdown 编辑区（左右分栏预览，或 Tab 切换编辑/预览）
- 编辑摘要输入
- 媒体上传区
- 保存按钮

#### 5.5.4 WikiHistoryPage

- 版本列表：编辑者、编辑摘要、时间
- 点击版本可查看该版本内容
- （可选）版本 diff 对比

### 5.6 肌群可视化组件

创建 `components/MuscleMap.tsx`：

- SVG 人体正面/背面图
- 接收 `targetMuscles: string[]` 和 `secondaryMuscles: string[]`
- 主要肌群填充深色，次要肌群填充浅色
- 支持点击查看肌群名称

**肌群 ID 映射**：

```typescript
const MUSCLE_GROUPS = {
  pectoralis_major: "胸大肌",
  latissimus_dorsi: "背阔肌",
  deltoids: "三角肌",
  biceps: "肱二头肌",
  triceps: "肱三头肌",
  quadriceps: "股四头肌",
  hamstrings: "腘绳肌",
  glutes: "臀大肌",
  calves: "小腿",
  abdominals: "腹肌",
  obliques: "腹斜肌",
  trapezius: "斜方肌",
  rhomboids: "菱形肌",
  erector_spinae: "竖脊肌",
  forearms: "前臂",
  hip_flexors: "髋屈肌",
};
```

---

## 6 业务规则

### 6.1 权限控制

| 操作 | 普通用户 | 管理员 |
|------|---------|--------|
| 浏览条目 | ✅ | ✅ |
| 新建条目 | ✅（status=draft，待审核） | ✅（直接 published） |
| 编辑条目 | ✅（编辑后 status=draft） | ✅（直接 published） |
| 删除条目 | ❌ | ✅ |
| 发表评论 | ✅ | ✅ |
| 删除评论 | 仅自己的 | 任意 |
| 点赞 | ✅ | ✅ |
| 举报 | ✅ | ✅ |
| 审核 | ❌ | ✅ |

### 6.2 Slug 生成规则

1. 对标题进行拼音转换（使用 pypinyin）
2. 转小写，空格替换为 `-`，去除特殊字符
3. 截取前 150 字符
4. 若冲突，追加 `-2`, `-3` 后缀

### 6.3 浏览量去重

同一用户对同一条目，每 30 分钟计为 1 次浏览。使用内存字典记录 `{user_id}:{article_id} → last_view_time`，过期自动清理。

### 6.4 热度排行缓存

使用 `cachetools.TTLCache(maxsize=100, ttl=3600)` 缓存排行结果，避免每次请求重新计算。

---

## 7 数据库迁移

新增 Alembic 迁移脚本，创建 5 张新表及相关索引。

```python
# 全文搜索索引（需在迁移中手动执行 SQL）
op.execute("""
    CREATE INDEX ix_wiki_articles_fts
    ON wiki_articles
    USING GIN (to_tsvector('simple', title || ' ' || coalesce(content_md, '')))
""")
```

---

## 8 初始数据播种

在 `wiki_seed.py` 中，为 P0 预置的 50 个动作各自动创建一条 Wiki 条目：

- title = exercise.name
- slug = 拼音转换
- type = "exercise"
- category = exercise.category
- content_md = 基础模版（动作名、分类、MET 值占位）
- exercise_id = exercise.id
- author_id = 系统管理员
- status = "published"

用户后续可在此基础上丰富内容。
