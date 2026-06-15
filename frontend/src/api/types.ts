export interface Story {
  id: string;
  title: string;
  order?: number;
}

export interface Conversation {
  id: string;
  title: string;
  time: string;
  preview: string;
  order?: number;
  type?: 'ai';
  provider?: string;
  createdAt?: string;
}

export type MessageSender = 'me' | 'other';

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  time?: string;
}

export interface UserAvatar {
  type: string;
  from: string;
  to: string;
}

export interface UserStats {
  readingTime: string;
  readingCount: string;
  ideaCount: string;
}

export interface UserGarden {
  activeDays: number;
}

export interface User {
  id: string;
  name: string;
  bio: string;
  info: string;
  lifeStrategy?: string;
  personalMemory?: string;
  avatar: UserAvatar;
  stats: UserStats;
  garden: UserGarden;
  updatedAt?: string;
}

export interface ProfileMenuItem {
  id: string;
  label: string;
  icon: string;
  action: string | null;
  /** 跳转 profile_edit 时使用的资料分区 */
  section?: ProfileEditSection;
  order?: number;
}

export type ProfileEditSection = 'info' | 'lifeStrategy' | 'personalMemory';

export interface SendMessageResult {
  user: Message;
  assistant?: Message;
}
