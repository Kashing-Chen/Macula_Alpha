# Macula

iOS 风格的移动端应用，采用**前后端分离**架构，分为三层：

| 目录 | 角色 | 技术栈 | 文档 |
| --- | --- | --- | --- |
| `frontend/` | 前端框架 | Vite + React 19 + TypeScript + Tailwind | [frontend/STRUCTURE.md](frontend/STRUCTURE.md) |
| `backend/` | 后端框架 | Node.js + Express（REST API） | [backend/STRUCTURE.md](backend/STRUCTURE.md) |
| `storage/` | 数据存储框架 | 纯 JSON 文件 | [storage/STRUCTURE.md](storage/STRUCTURE.md) |

## 架构总览

```
┌────────────┐   HTTP /api/*    ┌────────────┐   读写     ┌─────────────┐
│  frontend  │ ───────────────► │  backend   │ ─────────► │   storage   │
│  (浏览器)  │ ◄─────────────── │ (Express)  │ ◄───────── │ (JSON 文件) │
└────────────┘   JSON 响应      └────────────┘            └─────────────┘
   :3000          (Vite proxy)      :4000                    data/*.json
```

- 前端只通过 `/api` 与后端通信（开发时由 Vite proxy 转发到 `:4000`），不直接接触数据文件。
- 后端是唯一读写 `storage/` 的一方，对外提供 REST 接口。
- 数据已从原静态页面「搬迁」到 `storage/data/` 的 JSON 中，由前端动态渲染。

## 快速开始

需要两个终端：

```bash
# 终端 1：启动后端 (http://localhost:4000)
cd backend
npm install
npm run dev

# 终端 2：启动前端 (http://localhost:3000)
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 即可。前端的会话、消息、用户资料等全部来自后端 API。

### AI 对话（DeepSeek）

点击底部「+」会创建标题为「新对话」的 AI 会话。需在 `backend/` 配置 API Key：

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
```

后端 LLM 层位于 `backend/src/llm/`，当前默认使用 DeepSeek，可按同样方式扩展其它模型。

## 数据流示例

- 打开「对话」页 → `GET /api/conversations` + `GET /api/stories`
- 点开某个会话 → `GET /api/conversations/:id/messages`
- 发送消息 → `POST /api/conversations/:id/messages`（写入 `storage/data/messages.json`）
- 「我的」页 → `GET /api/user` + `GET /api/profile-menu`
- 编辑个人信息并返回 → `PUT /api/user`（写入 `storage/data/user.json`）

各层的详细结构、数据模型与扩展方式见各自的 `STRUCTURE.md`。
