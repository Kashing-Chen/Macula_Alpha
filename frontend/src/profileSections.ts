import type { ProfileEditSection, User } from './api/types';

export const PROFILE_SECTIONS: Record<
  ProfileEditSection,
  { title: string; field: keyof Pick<User, 'info' | 'lifeStrategy' | 'personalMemory'>; placeholder: string }
> = {
  info: {
    title: '个人信息',
    field: 'info',
    placeholder: '填写你的个人信息…',
  },
  lifeStrategy: {
    title: '人生战略',
    field: 'lifeStrategy',
    placeholder: '记录你的人生战略与长期目标…',
  },
  personalMemory: {
    title: '个人记忆',
    field: 'personalMemory',
    placeholder: '记录你想让 AI 记住的个人记忆…',
  },
};
