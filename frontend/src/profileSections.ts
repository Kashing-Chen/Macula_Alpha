import type { ProfileEditSection, User } from './api/types';

type ProfileField = keyof Pick<User, 'info' | 'lifeStrategy' | 'personalMemory' | 'promptTemplate'>;

export const PROFILE_SECTIONS: Record<
  ProfileEditSection,
  { title: string; field: ProfileField; placeholder: string; hint?: string }
> = {
  info: {
    title: '个人信息',
    field: 'info',
    placeholder: '填写你的个人信息…',
  },
  lifeStrategy: {
    title: '战略目标',
    field: 'lifeStrategy',
    placeholder: '记录你的人生战略与长期目标…',
  },
  personalMemory: {
    title: '个人记忆',
    field: 'personalMemory',
    placeholder: '记录你想让 AI 记住的个人记忆…',
  },
  promptManage: {
    title: '提示词管理',
    field: 'promptTemplate',
    placeholder: '编写系统提示词，可使用变量占位符…',
    hint: '支持变量：${个人信息}、${人生战略}、${个人记忆}。与大模型对话时会自动替换为对应内容，并作为系统提示词附加。',
  },
};
