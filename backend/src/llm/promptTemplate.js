/**
 * 将提示词模板中的 ${变量名} 替换为用户资料中的实际内容。
 * 支持的变量：个人信息、人生战略、个人记忆
 */
const VARIABLE_RESOLVERS = {
  个人信息: (user) => user.info ?? '',
  人生战略: (user) => user.lifeStrategy ?? '',
  个人记忆: (user) => user.personalMemory ?? '',
};

/** 解析并拼接最终系统提示词 */
export function resolvePromptTemplate(template, user) {
  if (!template || typeof template !== 'string') return '';

  const resolved = template.replace(/\$\{([^}]+)\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    const resolver = VARIABLE_RESOLVERS[key];
    return resolver ? resolver(user) : '';
  });

  return resolved.trim();
}

/**
 * 组装发给大模型的消息列表：系统提示词 + 对话历史。
 * @param {Array<{ sender: string, text: string }>} thread 存储层的消息线程
 * @param {object} user 用户资料
 * @param {function} toLlmMessages 将线程转为 LLM 角色的函数
 */
export function buildLlmMessages(thread, user, toLlmMessages) {
  const history = toLlmMessages(thread);
  const systemContent = resolvePromptTemplate(user.promptTemplate, user);

  if (!systemContent) return history;

  return [{ role: 'system', content: systemContent }, ...history];
}
