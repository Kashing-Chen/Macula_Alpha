import { readCollection, updateCollection } from '../db/jsonStore.js';
import { config } from '../config.js';
import { chat, toLlmMessages } from '../llm/index.js';

/** 将会话列表右侧的时间格式化为 HH:MM */
function formatListTime(date = new Date()) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** 截断预览文案，用于会话列表展示 */
function previewText(text, max = 60) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** 判断是否为 AI 对话（点击「+」创建的会话） */
function isAiConversation(conversation) {
  return conversation?.type === 'ai';
}

/** GET /conversations — 获取会话列表，按 order 升序排列 */
export async function listConversations(req, res) {
  const conversations = await readCollection('conversations');
  conversations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(conversations);
}

/** POST /conversations — 创建新的 AI 对话，默认标题「新对话」 */
export async function createConversation(req, res) {
  const id = `conv_${Date.now()}`;
  const provider = req.body?.provider || config.llm.defaultProvider;

  const conversation = {
    id,
    title: '新对话',
    type: 'ai',
    provider,
    time: '刚刚',
    preview: '',
    order: 0,
    createdAt: new Date().toISOString(),
  };

  await updateCollection('conversations', (conversations) => {
    // order 取当前最小值减 1，使新会话排在列表最前面
    const minOrder = conversations.reduce(
      (min, c) => Math.min(min, c.order ?? 0),
      0,
    );
    conversation.order = minOrder - 1;
    conversations.push(conversation);
    return conversations;
  });

  // 初始化空消息线程
  await updateCollection('messages', (messages) => {
    messages[id] = [];
    return messages;
  });

  res.status(201).json(conversation);
}

/** DELETE /conversations/:id — 删除会话及其消息 */
export async function deleteConversation(req, res) {
  const { id } = req.params;
  const conversations = await readCollection('conversations');
  if (!conversations.some((c) => c.id === id)) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  await updateCollection('conversations', (items) => items.filter((c) => c.id !== id));

  await updateCollection('messages', (messages) => {
    delete messages[id];
    return messages;
  });

  res.status(204).end();
}

/** POST /conversations/batch-delete — 批量删除会话及其消息 */
export async function deleteConversations(req, res) {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    const err = new Error('ids array is required');
    err.status = 400;
    throw err;
  }

  const idSet = new Set(ids.filter((id) => typeof id === 'string' && id));

  await updateCollection('conversations', (items) =>
    items.filter((c) => !idSet.has(c.id)),
  );

  await updateCollection('messages', (messages) => {
    for (const id of idSet) {
      delete messages[id];
    }
    return messages;
  });

  res.status(204).end();
}

/** GET /conversations/:id — 获取单个会话信息 */
export async function getConversation(req, res) {
  const conversations = await readCollection('conversations');
  const conversation = conversations.find((c) => c.id === req.params.id);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  res.json(conversation);
}

/** GET /conversations/:id/messages — 获取会话的消息列表 */
export async function listMessages(req, res) {
  const { id } = req.params;
  const conversations = await readCollection('conversations');
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const messages = await readCollection('messages');

  // 该会话已有专属消息线程
  if (Object.prototype.hasOwnProperty.call(messages, id)) {
    res.json(messages[id]);
    return;
  }

  // AI 新会话尚无消息，返回空数组（不回退到 _default）
  if (isAiConversation(conversation)) {
    res.json([]);
    return;
  }

  // 旧版静态会话无专属线程时，使用共享的默认示例消息
  res.json(messages._default ?? []);
}

/** 更新会话列表中的预览文案和最近时间 */
async function updateConversationMeta(id, preview) {
  const now = new Date();
  await updateCollection('conversations', (conversations) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      conv.preview = previewText(preview);
      conv.time = formatListTime(now);
    }
    return conversations;
  });
}

/**
 * POST /conversations/:id/messages — 发送消息
 * - 普通会话：仅保存用户消息
 * - AI 会话：保存用户消息后调用大模型，再保存并返回 AI 回复
 */
export async function createMessage(req, res) {
  const { id } = req.params;
  const { text, sender = 'me' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    const err = new Error('Message text is required');
    err.status = 400;
    throw err;
  }

  const conversations = await readCollection('conversations');
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const userMessage = {
    id: `msg_${Date.now()}`,
    sender: sender === 'other' ? 'other' : 'me',
    text: text.trim(),
    time: new Date().toISOString(),
  };

  let thread = [];

  await updateCollection('messages', (messages) => {
    thread = Array.isArray(messages[id]) ? [...messages[id]] : [];
    thread.push(userMessage);
    messages[id] = thread;
    return messages;
  });

  await updateConversationMeta(id, userMessage.text);

  // 非 AI 会话，或发送者不是用户本人，不触发大模型
  if (!isAiConversation(conversation) || userMessage.sender !== 'me') {
    res.status(201).json({ user: userMessage });
    return;
  }

  // 调用大模型生成回复
  const provider = conversation.provider || config.llm.defaultProvider;
  const llmMessages = toLlmMessages(thread);

  let assistantText;
  try {
    assistantText = await chat(provider, llmMessages);
  } catch (e) {
    const err = new Error(e.message || 'LLM request failed');
    err.status = e.status || 502;
    throw err;
  }

  const assistantMessage = {
    id: `msg_${Date.now() + 1}`,
    sender: 'other',
    text: assistantText,
    time: new Date().toISOString(),
  };

  await updateCollection('messages', (messages) => {
    const current = Array.isArray(messages[id]) ? messages[id] : [];
    current.push(assistantMessage);
    messages[id] = current;
    return messages;
  });

  await updateConversationMeta(id, assistantMessage.text);

  res.status(201).json({ user: userMessage, assistant: assistantMessage });
}
