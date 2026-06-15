import type {
  Conversation,
  Message,
  ProfileMenuItem,
  SendMessageResult,
  Story,
  User,
} from './types';

// API 基础路径。开发环境由 Vite 代理到后端（见 vite.config.ts），
// 生产部署时可通过 VITE_API_BASE 指向实际后端地址。
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : '';
    } catch {
      // 错误响应体不是 JSON 时忽略，使用默认错误信息
    }
    throw new Error(`Request failed (${res.status})${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getStories: () => request<Story[]>('/stories'),

  getConversations: () => request<Conversation[]>('/conversations'),
  createConversation: () =>
    request<Conversation>('/conversations', { method: 'POST', body: '{}' }),
  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  deleteConversation: (id: string) =>
    request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  deleteConversations: (ids: string[]) =>
    request<void>('/conversations/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getMessages: (id: string) => request<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, text: string) =>
    request<SendMessageResult>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getUser: () => request<User>('/user'),
  updateUser: (patch: Partial<User>) =>
    request<User>('/user', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  getProfileMenu: () => request<ProfileMenuItem[]>('/profile-menu'),
};
