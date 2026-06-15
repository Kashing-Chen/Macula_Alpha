import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  listConversations,
  createConversation,
  deleteConversation,
  deleteConversations,
  getConversation,
  listMessages,
  createMessage,
} from '../controllers/conversations.controller.js';

const router = Router();

router.get('/', asyncHandler(listConversations));
router.post('/', asyncHandler(createConversation));       // 创建新 AI 对话
router.post('/batch-delete', asyncHandler(deleteConversations)); // 批量删除（须在 /:id 之前注册）
router.delete('/:id', asyncHandler(deleteConversation));
router.get('/:id', asyncHandler(getConversation));
router.get('/:id/messages', asyncHandler(listMessages));
router.post('/:id/messages', asyncHandler(createMessage)); // 发消息（AI 会话会触发大模型回复）

export default router;
