import React from 'react';
import { Icons } from '../icons';
import type { UserAvatar } from '../api/types';

export function UserAvatarView({
  avatar,
  name,
  size = 88,
  iconSize = 48,
}: {
  avatar?: UserAvatar;
  name?: string;
  size?: number;
  iconSize?: number;
}) {
  const resolved = avatar ?? { type: 'gradient' as const, from: '#c8d8f0', to: '#a8bce4' };

  return (
    <div
      className="rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {resolved.type === 'image' && resolved.url ? (
        <img
          src={resolved.url}
          alt={name || '头像'}
          className="w-full h-full object-cover object-center block"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(to bottom, ${resolved.from ?? '#c8d8f0'}, ${resolved.to ?? '#a8bce4'})`,
          }}
        >
          <div style={{ width: iconSize, height: iconSize }}>
            <Icons.Avatar className="w-full h-full fill-white" />
          </div>
        </div>
      )}
    </div>
  );
}
