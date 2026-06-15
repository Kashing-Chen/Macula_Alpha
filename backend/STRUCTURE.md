# Backend 后端框架结构说明

`backend/` 是基于 **Node.js + Express** 的 REST API 服务，采用 ES Module。
它是前端与数据之间的唯一通道：对外暴露 `/api/*` 接口，对内通过 `jsonStore` 读写
`storage/data/` 下的 JSON 文件。**前后端完全分离**，通过 HTTP/JSON 通信。

## 技术栈

- Node.js（ESM，`"type": "module"`）
- Express 4 —— 路由与中间件
- cors —— 允许前端跨域调用
- 无数据库：数据层为 `storage/` 的 JSON 文件

## 目录结构

```
backend/
├── package.json
├── .gitignore
├── STRUCTURE.md              # 本文档
└── src/
    ├── server.js             # 入口：启动 HTTP 监听
    ├── app.js                # 组装 Express 应用（中间件 + 路由）
    ├── config.js             # 端口 / 存储路径 / CORS 等配置
    ├── db/
    │   └── jsonStore.js      # JSON 文件读写层（原子写 + 写锁）
    ├── middleware/
    │   └── errorHandler.js   # 404、统一错误处理、asyncHandler
    ├── controllers/          # 业务逻辑（读写数据、组装响应）
    │   ├── user.controller.js
    │   ├── stories.controller.js
    │   ├── profileMenu.controller.js
    │   └── conversations.controller.js
    └── routes/               # 路由表（URL → controller）
        ├── index.js          # 汇总挂载到 /api
        ├── user.routes.js
        ├── stories.routes.js
        ├── profileMenu.routes.js
        └── conversations.routes.js
```

## 分层职责

```
请求 → routes（定义 URL） → controllers（业务逻辑） → db/jsonStore（读写 JSON） → storage/data/*.json
```

- **routes**：只声明路径与 HTTP 方法，绑定到 controller。
- **controllers**：执行校验、调用数据层、返回 JSON。
- **db/jsonStore**：唯一接触文件系统的模块，提供
  `readCollection` / `writeCollection` / `updateCollection`，写入为原子操作并按集合串行化。
- **middleware**：`asyncHandler` 包裹异步处理器统一捕获异常；`notFound` + `errorHandler` 统一错误响应。

## 配置（`src/config.js`，均可用环境变量覆盖）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `4000` | 服务监听端口 |
| `STORAGE_DIR` | `../storage/data` | JSON 数据目录 |
| `CORS_ORIGIN` | `*` | 允许的跨域来源 |

## API 一览（基础路径 `/api`）

| 方法 | 路径 | 说明 | 数据源 |
| --- | --- | --- | --- |
| GET | `/health` | 健康检查 | — |
| GET | `/user` | 获取用户资料 | user.json |
| PUT | `/user` | 更新用户资料（name/bio/info/stats/garden/avatar） | user.json |
| GET | `/stories` | 顶部故事圆圈列表 | stories.json |
| GET | `/profile-menu` | 「我的」页菜单项 | profileMenu.json |
| GET | `/conversations` | 会话列表 | conversations.json |
| GET | `/conversations/:id` | 单个会话信息 | conversations.json |
| GET | `/conversations/:id/messages` | 某会话的消息线程（无则回退 `_default`） | messages.json |
| POST | `/conversations/:id/messages` | 发送消息 `{ text, sender? }` | messages.json |

### 响应约定
- 成功返回对应 JSON；创建成功返回 `201`。
- 错误返回 `{ "error": "..." }`，状态码 400/404/500。

## 运行

```bash
cd backend
npm install
npm run dev     # node --watch，自动重启
# 或 npm start
```

服务默认运行在 http://localhost:4000 。

## 如何新增一个接口

1. 在 `controllers/` 写业务函数，用 `jsonStore` 读写对应集合。
2. 在 `routes/` 新建/编辑路由文件，用 `asyncHandler` 包裹 controller。
3. 在 `routes/index.js` 用 `router.use('/xxx', ...)` 挂载。
4. 如需新数据集合，先在 `storage/data/` 建对应 JSON 文件。
