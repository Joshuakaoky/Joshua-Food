# 系统设计与技术方案

本文提出“社交点菜小程序”的 MVP 技术方案，用于指导后续工程落地。

## 总览
- **客户端**：小程序/H5（后端无关）。
- **后端**：RESTful API，JSON 交互。
- **数据库**：PostgreSQL（关系型，易于约束与查询）。
- **鉴权**：基于 JWT 的会话令牌。
- **存储**：对象存储（如 S3）保存图片，数据库仅保存 URL。

## 数据库表设计

### users
- `id` (UUID, PK)
- `name` (varchar, not null)
- `avatar_url` (text)
- `bio` (text)
- `visibility` (varchar, default 'PUBLIC', enum: PUBLIC/FRIENDS/PRIVATE)
- `created_at`, `updated_at` (timestamp with time zone)

### dishes
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> users.id, on delete cascade)
- `title` (varchar, not null)
- `cover_url` (text, not null)
- `intro` (text)
- `tags` (text[])
- `status` (varchar, default 'ACTIVE', enum: ACTIVE/UNPUBLISHED)
- `created_at`, `updated_at`
- 约束：`(owner_id, title)` 唯一，避免重复菜名。

### dish_photos
- `id` (UUID, PK)
- `dish_id` (UUID, FK -> dishes.id, on delete cascade)
- `url` (text, not null)
- `sort_order` (int default 0)

### dish_ingredients
- `id` (UUID, PK)
- `dish_id` (UUID, FK -> dishes.id, on delete cascade)
- `name` (varchar, not null)
- `quantity` (varchar)  — 文本存储，保持灵活（如“2 根”“适量”）。

### pantry_items
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> users.id, on delete cascade)
- `name` (varchar, not null)
- `status` (varchar, default 'HAVE', enum: HAVE/MISSING/LOW)
- `quantity` (varchar)
- 索引：`(owner_id, lower(name))` 便于食材匹配。

### orders
- `id` (UUID, PK)
- `host_id` (UUID, FK -> users.id, on delete cascade)
- `guest_id` (UUID, FK -> users.id, on delete set null)
- `dish_ids` (UUID[] not null) — 存储选中的菜品列表。
- `guest_note` (text)
- `host_note` (text)
- `visit_time` (timestamp with time zone)
- `people_count` (int)
- `missing_ingredients` (jsonb) — 结构：`[{name, quantity?}]`。
- `bring_by_guest` (jsonb) — 勾选后由访客自带的食材。
- `status` (varchar not null, enum: PENDING/ACCEPTED/REJECTED/REVISION_REQUESTED/CANCELLED/COMPLETED)
- `created_at`, `updated_at`

### order_events
- `id` (UUID, PK)
- `order_id` (UUID, FK -> orders.id, on delete cascade)
- `actor_id` (UUID, FK -> users.id, on delete set null)
- `from_status` (varchar)
- `to_status` (varchar)
- `note` (text) — 记录当次变更备注（如主人回复）。
- `created_at`
- 作用：用于审计与时间线展示。

## 关键业务逻辑

### 缺失食材计算
1. 查询所选菜品的食材（按名称统一为小写对比）。
2. 查询主人库存中 `status = HAVE` 的食材名称集合。
3. `missing = required - pantry_has`，同名去重。
4. 结果写入 `orders.missing_ingredients`，同时返回给访客勾选“自带”。

### 订单状态流
- 初始：`PENDING`。
- 主人操作：
  - 接受 -> `ACCEPTED`。
  - 拒绝 -> `REJECTED`。
  - 建议修改 -> `REVISION_REQUESTED`（需填写 `host_note`）。
  - 取消 -> `CANCELLED`。
  - 完成 -> `COMPLETED`（仅在已接受后）。
- 访客操作：
  - 取消 `PENDING` 或 `REVISION_REQUESTED` 的订单。
  - 接受主人建议：生成新订单或更新现有订单（业务策略可选）。
- 每次状态变更写入 `order_events`。

## API 草案

### 鉴权
- `POST /auth/register`：注册，返回 JWT。
- `POST /auth/login`：登录，返回 JWT。

### 用户与主页
- `GET /users/:id`：获取主页信息（含菜单与可见性）。
- `PATCH /users/me`：更新头像、简介、可见性。

### 菜品
- `GET /dishes?owner_id=`：查询主人菜品列表，支持 `status` 过滤。
- `GET /dishes/:id`：菜品详情（含图集与食材）。
- `POST /dishes`：创建菜品（需要认证）。
- `PATCH /dishes/:id`：编辑菜品。
- `POST /dishes/:id/unpublish`：下架。

### 库存
- `GET /pantry`：查看库存。
- `PUT /pantry`：批量更新/替换库存列表。
- `PATCH /pantry/:id`：更新单个食材状态或名称。

### 点菜请求（订单）
- `POST /orders`：创建订单，参数：`dish_ids[]`、`guest_note?`、`visit_time?`、`people_count?`、`bring_by_guest?`。服务端计算 `missing_ingredients` 并写入订单。
- `GET /orders?role=guest|host&status=`：列表（我的订单/接单台）。
- `GET /orders/:id`：详情（含缺失食材、备注、状态变更记录）。
- `POST /orders/:id/accept`：主人接受。
- `POST /orders/:id/reject`：主人拒绝（可附 `host_note`）。
- `POST /orders/:id/request-revision`：主人建议修改（必填 `host_note`）。
- `POST /orders/:id/cancel`：主人或访客取消（需角色校验）。
- `POST /orders/:id/complete`：主人完成。

## 开发分层
- **Handler/Controller**：参数校验、鉴权、调用领域服务。
- **Service**：业务逻辑（缺失食材计算、状态校验、事件记录）。
- **Repository**：数据库访问，使用事务确保状态流转一致性。
- **Integration**：对象存储上传封装。

## 安全与校验
- 所有写操作需登录校验；仅主人可管理菜品/库存、处理订单。
- 访问控制：主页可见性在查询用户主页时检查，私密主页仅本人可见；仅公开/好友可显示给访客。
- 输入规范化：食材名称统一小写/去空格后存储或比较，减少别名问题。

## MVP 迭代计划
1. 搭建项目骨架与鉴权模块。
2. 实现菜品 + 库存 + 缺失食材计算的订单创建闭环。
3. 补齐订单状态流（含事件记录）。
4. 接入对象存储上传与图片展示。
5. 打磨 UI、可见性控制与“按建议重新提交”入口。
