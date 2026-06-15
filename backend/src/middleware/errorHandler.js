/** 404 处理：请求的路径没有匹配到任何路由 */
export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars -- Express 错误中间件必须保留 next 参数签名
/** 统一错误处理：将异常转为 JSON 响应 */
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

/**
 * 包装异步路由处理器，捕获 Promise 中的异常并交给 errorHandler。
 * 用法：router.get('/xxx', asyncHandler(controller))
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
