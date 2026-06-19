# Backend 后端框架结构说明

`backend/` 是基于 **Python + FastAPI** 的 REST API 服务。
它是前端与数据之间的唯一通道：对外暴露 `/api/*` 接口，对内通过 `json_store` 读写
`storage/data/` 下的 JSON 文件。**前后端完全分离**，通过 HTTP/JSON 通信。

AI 对话层使用 **LangGraph `create_react_agent`**（LangChain 生态），默认接入 DeepSeek（OpenAI 兼容接口）。

## 技术栈

- Python 3.10+（推荐 3.12；滴答清单 MCP 适配器需要 3.10+）
- FastAPI —— 路由与 ASGI 服务
- Uvicorn —— 开发/生产 HTTP 服务器
- LangChain + LangGraph —— Agent 编排与大模型调用
- langchain-openai —— DeepSeek（OpenAI 兼容）Chat 模型
- 无数据库：数据层为 `storage/` 的 JSON 文件

## 目录结构

```
backend/
├── requirements.txt
├── run.py                    # 开发入口（uvicorn --reload）
├── .env.example
├── .gitignore
├── STRUCTURE.md              # 本文档
└── app/
    ├── main.py               # FastAPI 应用实例
    ├── config.py             # 端口 / 存储路径 / LLM 等配置
    ├── db/
    │   └── json_store.py     # JSON 文件读写层（原子写 + 异步锁）
    ├── llm/
    │   └── agent.py          # LangGraph ReAct Agent（create_react_agent + DeepSeek）
    ├── toolbox/              # Agent 工具箱，按集成模块划分
    │   ├── registry.py       # 聚合各模块工具
    │   ├── user_profile.py   # 用户资料读取
    │   ├── dida365.py        # 滴答清单官方 MCP
    │   └── email.py          # 邮箱（预留，尚未接入）
    ├── conversation/         # 对话参数格式化（非 Agent 工具）
    │   ├── template.py       # 系统提示词模板变量解析
    │   └── messages.py       # UI 线程 → LLM messages
    └── routers/              # REST 路由
        ├── user.py
        ├── stories.py
        ├── profile_menu.py
        └── conversations.py
```

## 分层职责

```
请求 → routers（定义 URL） → db/json_store（读写 JSON） → storage/data/*.json
                              ↘ conversation/（格式化对话参数）
                              ↘ llm/agent（AI 会话时调用 LangChain Agent）
                                    ↘ toolbox/（按模块加载工具）
```

- **routers**：校验请求、调用数据层、触发 Agent、返回 JSON。
- **db/json_store**：唯一接触文件系统的模块，提供
  `read_collection` / `write_collection` / `update_collection`，写入为原子操作并按集合串行化。
- **conversation/**：`template.py` 解析 `${个人信息}` 等变量；`messages.py` 将 UI 消息线程转为 LLM 消息格式。
- **toolbox/**：Agent 工具按集成划分。`registry.py` 聚合各模块；新增 MCP 时在 `MCP_TOOL_LOADERS` 注册即可。
- **toolbox/dida365**：通过 `langchain-mcp-adapters` 连接[滴答清单官方 MCP](https://help.dida365.com/articles/7438132116019216384)（Streamable HTTP）。
- **llm/agent**：组装系统提示词、对话历史，通过 LangGraph ReAct Agent 调用 DeepSeek 并返回回复。

## 滴答清单 MCP

官方 MCP 地址：`https://mcp.dida365.com`（仅支持 Streamable HTTP，不支持 SSE）。

1. 在 [帮助文档](https://help.dida365.com/articles/7438132116019216384) 按指引，于 Cursor / Claude 等客户端完成 OAuth 授权；或直接向滴答清单获取 Bearer Token。
2. 将 Token 写入 `backend/.env`：
   ```env
   DIDA365_MCP_TOKEN=你的_Bearer_Token
   ```
3. 重启后端。Agent 会自动加载滴答清单 MCP 工具（工具名带 `dida365_` 前缀），可自然语言查询、创建、更新任务。

未配置 Token 时，Agent 仍正常工作，仅无滴答清单工具。

## 调试：`storage/data/lastLlmRequest.md`

每次 AI 回复后，会覆盖写入最近一次 LangChain 执行轨迹（Markdown 格式），便于直接阅读，包含：

- **用户** — 本轮用户输入
- **AI** — 最终回复文本
- **Agent 执行详情** — 推理步骤、工具调用参数、工具返回内容
- **Token 消耗** — 每步明细与本轮合计
- **调用的工具** — 本轮实际调用的工具名称

## 配置（`app/config.py`，均可用环境变量覆盖）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `4000` | 服务监听端口 |
| `STORAGE_DIR` | `../storage/data` | JSON 数据目录 |
| `CORS_ORIGIN` | `*` | 允许的跨域来源 |
| `LLM_PROVIDER` | `deepseek` | 默认大模型提供商 |
| `DEEPSEEK_API_KEY` | — | DeepSeek API 密钥（必填才能使用 AI 对话） |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名称 |
| `DIDA365_MCP_ENABLED` | `true` | 是否启用滴答清单 MCP |
| `DIDA365_MCP_URL` | `https://mcp.dida365.com` | 官方 MCP 地址 |
| `DIDA365_MCP_TOKEN` | — | Bearer Token（OAuth 授权后填入） |

## API 一览（基础路径 `/api`）

| 方法 | 路径 | 说明 | 数据源 |
| --- | --- | --- | --- |
| GET | `/health` | 健康检查 | — |
| GET | `/user` | 获取用户资料 | user.json |
| PUT | `/user` | 更新用户资料 | user.json |
| GET | `/stories` | 顶部故事圆圈列表 | stories.json |
| GET | `/profile-menu` | 「我的」页菜单项 | profileMenu.json |
| GET | `/conversations` | 会话列表 | conversations.json |
| POST | `/conversations` | 创建 AI 对话 | conversations.json |
| DELETE | `/conversations/:id` | 删除会话 | conversations.json |
| POST | `/conversations/batch-delete` | 批量删除 | conversations.json |
| GET | `/conversations/:id` | 单个会话信息 | conversations.json |
| GET | `/conversations/:id/messages` | 某会话的消息线程 | messages.json |
| POST | `/conversations/:id/messages` | 发送消息 `{ text, sender? }` | messages.json |

### 响应约定
- 成功返回对应 JSON；创建成功返回 `201`。
- 错误返回 `{ "error": "..." }`，状态码 400/404/500。

## 运行

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 填入 DEEPSEEK_API_KEY
python run.py               # 或: uvicorn app.main:app --reload --port 4000
```

服务默认运行在 http://localhost:4000 。

## 扩展 Agent

### 新增 MCP 工具模块

1. 在 `app/toolbox/` 下新建模块（参考 `dida365.py`），实现 `async def load_tools() -> List`。
2. 在 `app/toolbox/registry.py` 的 `MCP_TOOL_LOADERS` 中注册模块名与 `load_tools`。
3. 如需新配置项，在 `app/config.py` 添加对应环境变量。

### 新增本地工具

1. 在 `app/toolbox/` 下新建或扩展模块（参考 `user_profile.py`），实现 `build_tools(user) -> List`。
2. 在 `registry.build_tools()` 中合并该模块工具。

### 新增 REST 接口

在 `routers/` 添加路由并在 `app/main.py` 中 `include_router`。
