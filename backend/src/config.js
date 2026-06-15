import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 无论从哪个目录启动，都固定加载 backend/.env（避免 ES Module 导入顺序导致 dotenv 晚于 config 执行）
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// 项目根目录：从 backend/src 向上两级
const projectRoot = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT) || 4000,
  // JSON 数据目录，可通过环境变量 STORAGE_DIR 覆盖，默认为同级 storage/data
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.join(projectRoot, 'storage', 'data'),
  // 允许跨域的前端来源，开发环境对应 Vite 开发服务器
  corsOrigin: process.env.CORS_ORIGIN || '*',
  llm: {
    // 默认大模型提供商，新建 AI 会话时使用
    defaultProvider: process.env.LLM_PROVIDER || 'deepseek',
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
  },
};
