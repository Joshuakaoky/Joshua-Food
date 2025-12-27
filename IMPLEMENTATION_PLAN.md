# 实施与迭代计划

在既有的产品需求和系统设计基础上，下面列出可直接开工的工程拆解、任务优先级、里程碑交付物，以及接口/表结构的落地提示，帮助团队快速启动。

## 里程碑与优先级
- **M0 基础脚手架（1 周）**
  - 选型：Node.js + NestJS / Express（或 Django/FastAPI），PostgreSQL，Prisma/TypeORM。
  - 基础：项目结构、Docker Compose（db + app）、环境变量管理、JWT 鉴权中间件、日志（pino/winston）。
  - 输出：跑通健康检查、注册登录、鉴权保护示例接口。
- **M1 点菜闭环 MVP（2 周）**
  - 完成用户主页查询、菜品 CRUD、库存 CRUD。
  - 实现订单创建时的缺失食材计算与存储。
  - 交付：`/orders` 创建/查询，`/dishes`、`/pantry` 基础接口可用，前端可完成下单流程。
- **M2 订单状态流与时间线（1 周）**
  - 接受/拒绝/建议修改/取消/完成接口与校验。
  - 记录 `order_events` 时间线；列表/详情展示主人回复备注。
  - 交付：状态可视、主人备注可见，访客能按建议重新提交（生成新单或更新单）。
- **M3 媒体与体验增强（1 周）**
  - 对接对象存储上传（STS + 回传 URL）。
  - 页面动线优化：快捷勾选“我自带”、复制缺失食材清单。
- **M4 扩展与质量（持续）**
  - 别名映射、数量累加、好友可见；端到端自动化测试、监控告警。

## 工程拆解（任务清单）
1. **基础设施**
   - Docker Compose: `app` + `postgres` + `pgadmin`（可选）。
   - 全局配置：`CONFIG_SERVICE` 读取 `.env`，校验必需变量（数据库、JWT_SECRET、S3 相关）。
   - 中间件：请求日志、错误处理（统一错误响应格式 `{code, message, details}`）。

2. **鉴权与用户**
   - 密码存储：argon2/bcrypt；JWT payload `{sub: userId}`；刷新 token（可选）。
   - 路由守卫：仅公开接口允许匿名访问（如 `GET /users/:id` 公开主页且 visibility=PUBLIC）。
   - 用户可更新 `avatar_url`、`bio`、`visibility`。

3. **菜品模块**
   - `dishes`、`dish_photos`、`dish_ingredients` 的仓储与 DTO。
   - 校验：`title` 非空，`cover_url` 非空；`owner_id`=当前用户。
   - 下架接口仅切换 `status`，不硬删除。

4. **库存模块**
   - `pantry_items` 仓储；名称统一为小写存储；`status` 默认 `HAVE`。
   - 批量写入：`PUT /pantry` 用事务 replace 旧库存。

5. **缺失食材计算服务**
   - 输入：`dishIds[]`、`hostId`。
   - 步骤：聚合菜品食材 -> 名称归一（lower、trim） -> 查询主人库存 `status=HAVE` -> `missing = required - have` -> 去重 -> 返回 `[{name, quantity?}]`。
   - 复用：创建订单时调用；后续可用于“按建议重新提交”。

6. **订单模块**
   - 状态机守卫：
     - `PENDING` -> `ACCEPTED|REJECTED|REVISION_REQUESTED|CANCELLED`
     - `ACCEPTED` -> `CANCELLED|COMPLETED`
     - `REVISION_REQUESTED` -> `CANCELLED`
   - 角色校验：主人才能处理订单；访客可取消 PENDING/REVISION。
   - 每次变更写 `order_events`（actor、from/to、note）。
   - 查询：`/orders?role=guest|host&status=` 支持分页、按创建时间倒序。

7. **“按建议重新提交”实现建议**
   - 方案 A（简单）：访客在 `REVISION_REQUESTED` 详情页点击“重新提交” -> 前端复用原始 `dish_ids`/备注并允许修改 -> 调用 `POST /orders` 生成**新订单**并标记旧单 `CANCELLED`。
   - 方案 B（少单量）：提供 `POST /orders/:id/resubmit` 更新原订单，状态重置为 `PENDING`，保留 `order_events` 时间线记录。
   - 推荐先做方案 A，逻辑简单、审计清晰。

8. **测试与质量**
   - 单元测试：服务层（缺失食材计算、状态流校验）。
   - 集成测试：基于超轻量内存 PG（或 test schema）跑接口用例。
   - 静态检查：ESLint/Prettier；pre-commit 钩子。

## 数据库落地提示（SQL 草案）
```sql
CREATE TYPE visibility AS ENUM ('PUBLIC','FRIENDS','PRIVATE');
CREATE TYPE dish_status AS ENUM ('ACTIVE','UNPUBLISHED');
CREATE TYPE pantry_status AS ENUM ('HAVE','MISSING','LOW');
CREATE TYPE order_status AS ENUM ('PENDING','ACCEPTED','REJECTED','REVISION_REQUESTED','CANCELLED','COMPLETED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  visibility visibility NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  cover_url TEXT NOT NULL,
  intro TEXT,
  tags TEXT[],
  status dish_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, title)
);

CREATE TABLE dish_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE dish_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  quantity VARCHAR
);

CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  status pantry_status NOT NULL DEFAULT 'HAVE',
  quantity VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, lower(name))
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dish_ids UUID[] NOT NULL,
  guest_note TEXT,
  host_note TEXT,
  visit_time TIMESTAMPTZ,
  people_count INT,
  missing_ingredients JSONB,
  bring_by_guest JSONB,
  status order_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status order_status,
  to_status order_status,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pantry_owner_lower_name ON pantry_items (owner_id, lower(name));
CREATE INDEX idx_orders_host_status ON orders (host_id, status);
CREATE INDEX idx_orders_guest_status ON orders (guest_id, status);
```

## API 请求/响应示例（JSON）
- **创建订单** `POST /orders`
  ```json
  {
    "dish_ids": ["<dish-uuid>"],
    "visit_time": "2025-01-01T12:00:00Z",
    "people_count": 4,
    "guest_note": "想早点吃，少辣",
    "bring_by_guest": [{"name": "beef"}]
  }
  ```
  响应（服务端计算 `missing_ingredients` 并回写）：
  ```json
  {
    "id": "<order-uuid>",
    "status": "PENDING",
    "missing_ingredients": [
      {"name": "ginger"},
      {"name": "garlic"}
    ]
  }
  ```
- **主人建议修改** `POST /orders/:id/request-revision`
  ```json
  {"host_note": "可以，但周六晚，牛肉请自带"}
  ```
- **访客取消** `POST /orders/:id/cancel`
  ```json
  {"reason": "临时有事"}
  ```

## 监控与运维提示
- 日志：结构化 JSON，记录 `requestId`、`userId`、路径、耗时、错误码。
- 健康检查：`/healthz`（依赖检查：DB ping）。
- 指标：HTTP latency、错误率、订单状态转换计数、缺失食材计算耗时。
- 告警：5xx 激增、DB 连接池耗尽、磁盘/对象存储上传失败率。

## 前端动线提示
- 菜品详情页：突出“加入本次点菜”与标签、食材列表。
- 发起点菜页：展示缺失食材并允许勾选“我自带”；提交前提示主人主页的可见性状态。
- 订单详情：状态 badge + 主人回复备注，提供“按建议重新提交”快捷按钮（方案 A/B）。

> 本计划可直接作为任务分发依据，落地时请保持与《PRODUCT_REQUIREMENTS.md》《SYSTEM_DESIGN.md》一致。
