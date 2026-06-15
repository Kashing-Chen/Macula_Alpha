import * as deepseek from './providers/deepseek.js';

/** 已注册的大模型提供商表，键为 provider 名称 */
const providers = {
  [deepseek.name]: deepseek,
};

/**
 * 根据名称获取大模型提供商实例。
 * 扩展新模型：在 llm/providers/ 下新建文件，并在此注册。
 */
export function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    const err = new Error(`Unknown LLM provider: ${name}`);
    err.status = 400;
    throw err;
  }
  return provider;
}

/** 返回所有已注册的提供商名称列表（供诊断或未来设置页使用） */
export function listProviders() {
  return Object.keys(providers);
}

/**
 * 向指定提供商发送对话补全请求。
 * @param {string} providerName 提供商名称，如 'deepseek'
 * @param {Array<{ role: 'system'|'user'|'assistant', content: string }>} messages 对话历史
 * @returns {Promise<string>} 模型回复的文本内容
 */
export async function chat(providerName, messages) {
  const provider = getProvider(providerName);
  return provider.chat(messages);
}

/**
 * 将存储层的消息格式转换为 LLM API 所需的角色格式。
 * sender='me' → role='user'，sender='other' → role='assistant'
 */
export function toLlmMessages(thread) {
  return thread.map((m) => ({
    role: m.sender === 'me' ? 'user' : 'assistant',
    content: m.text,
  }));
}
