# Frontend 前端框架结构说明

`frontend/` 是基于 **Vite + React 19 + TypeScript + Tailwind CSS v4** 的单页应用，
还原一套 iOS 风格的移动端 UI（对话列表 / 聊天详情 / 我的 / 个人信息编辑）。
数据**不再写死在页面里**，而是通过 API 客户端从 `backend/` 动态获取。

## 技术栈

- Vite 6 —— 开发服务器与打包
- React 19 + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite`）
- 数据获取：浏览器原生 `fetch`，封装于 `src/api/client.ts`

## 目录结构

```
frontend/
├── index.html              # 挂载点 #root
├── package.json
├── vite.config.ts          # 含 /api → 后端的 proxy 配置
├── tsconfig.json
├── assets/
└── src/
    ├── main.tsx            # React 入口
    ├── App.tsx             # 顶层：页面切换 + 当前会话状态
    ├── index.css           # 全局样式 / Tailwind
    ├── icons.tsx           # 内联 SVG 图标集合
    ├── vite-env.d.ts       # Vite 环境变量类型
    ├── api/                # —— 与后端通信的唯一入口 ——
    │   ├── client.ts       # api.getXxx / api.updateXxx 等方法
    │   └── types.ts        # 与后端对齐的 TS 类型定义
    ├── components/
    │   └── TabBar.tsx      # 底部毛玻璃导航栏
    └── pages/
        ├── ChatList.tsx    # 会话列表（拉取 stories + conversations）
        ├── ChatDetail.tsx  # 聊天详情（按会话拉取消息 + 发送消息）
        ├── Profile.tsx     # 我的（拉取 user + profileMenu）
        └── ProfileEdit.tsx # 个人信息编辑（读取并保存 user.info）
```

## 页面与数据流

应用通过 `App.tsx` 的 `currentPage` 状态在 4 个页面间切换（无路由库），
并用 `activeConversationId` 记录当前打开的会话。

| 页面 | 拉取的数据 | 写操作 |
| --- | --- | --- |
| `ChatList` | `GET /stories`, `GET /conversations` | — |
| `ChatDetail` | `GET /conversations/:id`, `GET /conversations/:id/messages` | `POST /conversations/:id/messages`（发消息） |
| `Profile` | `GET /user`, `GET /profile-menu` | — |
| `ProfileEdit` | `GET /user` | `PUT /user`（返回时保存 info） |

数据流：

```
页面组件 (useEffect)
      │ 调用
      ▼
src/api/client.ts  →  fetch('/api/...')  →  (Vite proxy)  →  backend :4000
```

## API 客户端约定（`src/api/client.ts`）

- 基础路径默认 `/api`，开发环境由 Vite proxy 转发到后端，**前端无需关心后端端口**。
- 可用环境变量 `VITE_API_BASE` 指向已部署的后端，`VITE_API_TARGET` 覆盖 proxy 目标。
- 所有方法返回 `Promise<T>`，HTTP 非 2xx 会抛出带后端 `error` 信息的异常。
- `src/api/types.ts` 的类型与 `storage` 的数据模型 / 后端响应保持一致。

## 与后端的分离

- 前端**绝不**直接读取 `storage/`，所有数据经 `api` 客户端走 HTTP。
- UI 渲染均由接口数据驱动；列表、菜单、消息气泡等都基于响应动态生成。
- 后端地址通过 proxy / 环境变量注入，便于本地开发与独立部署。

## 运行

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

> 需先启动 `backend`（默认 :4000），否则接口请求会失败、页面显示「加载失败」。

常用脚本：`npm run dev` / `npm run build` / `npm run preview` / `npm run lint`(tsc)。
