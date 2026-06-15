import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

/** 创建并配置 Express 应用实例 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json()); // 解析 JSON 请求体

  app.use('/api', apiRoutes); // 所有业务接口挂载在 /api 下

  app.use(notFound);    // 未匹配路由 → 404
  app.use(errorHandler); // 统一错误处理

  return app;
}
