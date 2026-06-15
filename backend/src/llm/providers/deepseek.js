import { config } from '../../config.js';

/** 提供商标识，与 LLM_PROVIDER 环境变量及会话的 provider 字段对应 */
export const name = 'deepseek';

/**
 * 调用 DeepSeek 对话补全接口（兼容 OpenAI Chat Completions 格式）。
 * @param {Array<{ role: string, content: string }>} messages 对话历史
 * @returns {Promise<string>} 模型回复文本
 */
export async function chat(messages) {
  const { apiKey, baseUrl, model } = config.llm.deepseek;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false, // 暂不使用流式，一次性返回完整回复
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    const err = new Error(`DeepSeek API error (${res.status}): ${detail}`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error('DeepSeek returned an empty response');
    err.status = 502;
    throw err;
  }
  return content.trim();
}
