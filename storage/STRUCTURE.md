# Storage 数据存储框架结构说明

`storage/` 是项目的**数据持久层**，使用纯 JSON 文件存储数据。它不包含任何运行时代码，
仅作为数据源被 `backend/` 读取与写入。前端**不会**直接访问本目录，必须经由后端 API。

## 目录结构

```
storage/
├── STRUCTURE.md          # 本文档
└── data/                 # 所有数据集合（每个文件 = 一个集合）
    ├── user.json         # 用户资料（单对象）
    ├── stories.json      # 顶部「故事/快报」圆圈列表（数组）
    ├── conversations.json# 会话列表（数组）
    ├── messages.json     # 消息线程，按会话 id 索引（对象映射）
    └── profileMenu.json  # 「我的」页九宫格菜单项（数组）
```

## 设计约定

- **一个文件 = 一个集合**。文件名（不含扩展名）即集合名，后端通过集合名读写。
- 所有数据来源于原静态前端页面，已按结构「搬迁」为 JSON。
- 写入由后端 `jsonStore` 以「临时文件 + rename」方式原子落盘，避免写坏文件。
- 字段命名统一使用 camelCase。

## 数据模型（Schema）

### user.json（对象）
| 字段 | 类型 | 说明 | 来源页面 |
| --- | --- | --- | --- |
| `id` | string | 用户唯一标识 | — |
| `name` | string | 昵称，如 `Kasing` | Profile |
| `bio` | string | 一句话简介 | Profile |
| `info` | string | 「个人信息」长文本（可编辑） | ProfileEdit |
| `avatar` | object | `{ type, from, to }` 头像渐变色 | Profile |
| `stats` | object | `{ readingTime, readingCount, ideaCount }` 今日统计 | Profile |
| `garden` | object | `{ activeDays }` 花园足迹活跃天数 | Profile |
| `updatedAt` | string | 最近更新时间（ISO，后端写入） | — |

### stories.json（数组）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 唯一标识 |
| `title` | string | 标题，如 `每日晨报` |
| `order` | number | 展示排序 |

### conversations.json（数组）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 会话唯一标识，如 `conv_camping` |
| `title` | string | 会话名 |
| `time` | string | 列表右侧时间，如 `11:32` / `星期六` |
| `preview` | string | 列表预览文案 |
| `order` | number | 展示排序 |

### messages.json（对象映射：会话 id → 消息数组）
- 键为会话 `id`；特殊键 `_default` 为「无专属线程会话」的回退内容（迁移自原 ChatDetail 静态示例）。

每条消息：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 消息唯一标识 |
| `sender` | `"me"` \| `"other"` | 决定气泡左右与配色 |
| `text` | string | 消息正文 |
| `time` | string | 可选，时间分隔标签（仅线程首条展示） |

### profileMenu.json（数组）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 唯一标识 |
| `label` | string | 菜单文字，如 `个人信息` |
| `icon` | string | 对应前端 `icons.tsx` 中的图标名 |
| `action` | string \| null | 点击跳转的页面 key（null 表示暂不可点） |
| `order` | number | 展示排序 |

## 如何新增一个集合

1. 在 `data/` 下新建 `<name>.json`。
2. 后端通过 `readCollection('<name>')` / `writeCollection('<name>', data)` 访问。
3. 新增对应 controller + route 暴露 API（详见 `backend/STRUCTURE.md`）。
