# Macula

iOS 风格的移动端应用，采用**前后端分离**架构，分为三层：

| 目录 | 角色 | 技术栈 | 文档 |
| --- | --- | --- | --- |
| `frontend/` | 前端框架 | Vite + React 19 + TypeScript + Tailwind | [frontend/STRUCTURE.md](frontend/STRUCTURE.md) |
| `backend/` | 后端框架 | Python + FastAPI + LangChain Agent | [backend/STRUCTURE.md](backend/STRUCTURE.md) |
| `storage/` | 数据存储框架 | 纯 JSON 文件 | [storage/STRUCTURE.md](storage/STRUCTURE.md) |

## 架构总览

```
┌────────────┐   HTTP /api/*    ┌────────────┐   读写     ┌─────────────┐
│  frontend  │ ───────────────► │  backend   │ ─────────► │   storage   │
│  (浏览器)  │ ◄─────────────── │ (FastAPI)  │ ◄───────── │ (JSON 文件) │
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
python3.12 -m venv .venv   # 需 Python 3.10+（滴答清单 MCP）
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填入 DEEPSEEK_API_KEY、DIDA365_MCP_TOKEN（可选）
python run.py

# 终端 2：启动前端 (http://localhost:3000)
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 即可。前端的会话、消息、用户资料等全部来自后端 API。

### AI 对话（DeepSeek + 滴答清单 MCP）

需在 `backend/` 配置 API Key；若要 Agent 管理滴答任务，另配 MCP Token：

```bash
cd backend
cp .env.example .env
# 编辑 .env：DEEPSEEK_API_KEY、DIDA365_MCP_TOKEN
```

滴答清单 MCP 配置见 [官方文档](https://help.dida365.com/articles/7438132116019216384)。Token 可在 Cursor 等客户端完成 OAuth 后获取。

后端 LLM 层位于 `backend/app/llm/`，使用 LangChain Agent + DeepSeek；已接入[滴答清单官方 MCP](https://help.dida365.com/articles/7438132116019216384)，可在对话中管理任务。

## 数据流示例

- 打开「对话」页 → `GET /api/conversations` + `GET /api/stories`
- 点开某个会话 → `GET /api/conversations/:id/messages`
- 发送消息 → `POST /api/conversations/:id/messages`（写入 `storage/data/messages.json`）
- 「我的」页 → `GET /api/user` + `GET /api/profile-menu`
- 编辑个人信息并返回 → `PUT /api/user`（写入 `storage/data/user.json`）

各层的详细结构、数据模型与扩展方式见各自的 `STRUCTURE.md`。
