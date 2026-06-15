/// <reference types="vite/client" />

/** Vite 环境变量类型声明，对应 .env 中以 VITE_ 开头的变量 */
interface ImportMetaEnv {
  /** 后端 API 基础路径，默认 /api */
  readonly VITE_API_BASE?: string;
  /** Vite 开发服务器代理目标，默认 http://localhost:4000 */
  readonly VITE_API_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
