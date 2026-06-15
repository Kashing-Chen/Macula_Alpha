import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // AI Studio 通过 DISABLE_HMR 环境变量禁用热更新，请勿修改此逻辑
      hmr: process.env.DISABLE_HMR !== 'true',
      // DISABLE_HMR 为 true 时关闭文件监听，减少 Agent 编辑时的 CPU 占用
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // 将 /api 请求代理到后端，前端无需关心后端端口
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
