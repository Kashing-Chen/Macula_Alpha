import React, { useEffect, useState } from 'react';
import { Icons } from '../icons';
import { api } from '../api/client';
import { UserAvatarView } from '../components/UserAvatarView';
import type { ProfileEditSection, ProfileMenuItem, User } from '../api/types';

type IconName = keyof typeof Icons;

export function Profile({
  navigate,
  openProfileEdit,
}: {
  navigate: (page: string) => void;
  openProfileEdit: (section: ProfileEditSection) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [menu, setMenu] = useState<ProfileMenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getUser(), api.getProfileMenu()])
      .then(([userData, menuData]) => {
        if (cancelled) return;
        setUser(userData);
        setMenu(menuData);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col bg-[#f2f2f4] w-full h-full overflow-hidden relative">
      <div className="h-[54px] shrink-0" />
      <header className="flex items-center justify-end px-4 pb-2 shrink-0">
        <button className="w-10 h-10 border-none rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer text-[#1c1c1e] shrink-0 active:opacity-75">
          <Icons.Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-[120px] flex flex-col gap-3.5 scrollbar-hide">
        {error && (
          <div className="text-center text-[13px] text-[#ff3b30]">加载失败：{error}</div>
        )}

        <section className="flex flex-col items-center pt-1 pb-2">
          <div className="mb-3.5">
            <UserAvatarView avatar={user?.avatar} name={user?.name} />
          </div>
          <h1 className="text-[26px] font-bold text-[#1c1c1e] tracking-[-0.02em] leading-[1.2]">{user?.name ?? '…'}</h1>
          <p className="mt-1.5 text-[14px] text-[#8e8e93] font-normal text-center">{user?.lifeVision ?? user?.bio ?? ''}</p>
        </section>

        <section className="bg-white rounded-[20px] shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-[20px_8px_16px]">
          <div className="grid grid-cols-4 gap-y-1">
            {menu.map((item) => {
              const Icon = (Icons[item.icon as IconName] ?? Icons.ProfileInfo) as (props: { className?: string }) => React.ReactElement;
              return (
                <MenuBtn
                  key={item.id}
                  icon={<Icon className="w-[26px] h-[26px]" />}
                  label={item.label}
                  onClick={
                    item.action === 'profile_edit' && item.section
                      ? () => openProfileEdit(item.section as ProfileEditSection)
                      : item.action
                        ? () => navigate(item.action as string)
                        : undefined
                  }
                />
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-[20px] shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-4">
          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">今天</h2>
          <div className="flex gap-2 mt-3.5">
            <StatBox label="阅读时长" value={user?.stats.readingTime ?? '—'} labelColor="text-[#34c759]" />
            <StatBox label="阅读篇数" value={user?.stats.readingCount ?? '—'} labelColor="text-[#007aff]" />
            <StatBox label="想法记录" value={user?.stats.ideaCount ?? '—'} labelColor="text-[#ff9500]" />
          </div>
        </section>

        <section className="bg-white rounded-[20px] shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-[16px_16px_20px]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[17px] font-semibold text-[#1c1c1e]">花园足迹</h2>
            <span className="text-[13px] text-[#8e8e93]">已活跃{user?.garden.activeDays ?? 0}天</span>
          </div>
          <Heatmap />
        </section>
      </main>
    </div>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-[10px_4px] border-none bg-transparent cursor-pointer text-[#1c1c1e] active:opacity-70 mx-auto w-full">
      <div className="w-7 h-7 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[12px] text-[#3a3a3c] leading-[1.2] whitespace-nowrap">{label}</span>
    </button>
  );
}

function StatBox({ label, value, labelColor }: { label: string, value: string, labelColor: string }) {
  return (
    <div className="flex-1 bg-[#f5f5f7] rounded-[12px] p-[12px_10px] flex flex-col gap-1.5 min-w-0">
      <span className={`text-[12px] font-medium ${labelColor}`}>{label}</span>
      <span className="text-[15px] font-semibold text-[#1c1c1e]">{value}</span>
    </div>
  );
}

function Heatmap() {
  const cols = 52;
  const rows = 7;
  const dots = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const isToday = c === cols - 1 && r === rows - 1;
      dots.push(
        <span 
          key={`${c}-${r}`} 
          className={`w-[9px] h-[9px] rounded-full shrink-0 relative ${isToday ? 'bg-[#d1d1d6]' : 'bg-[#e8e8ed]'}`}
        >
          {isToday && (
             <span className="absolute -top-[2px] -right-[14px] text-[9px] font-semibold text-[#34c759] leading-[1] whitespace-nowrap">今</span>
          )}
        </span>
      );
    }
  }

  return (
    <div className="flex items-start gap-[6px] overflow-x-auto scrollbar-hide">
      <span className="text-[10px] text-[#aeaeb2] rotate-180 shrink-0 pt-[2px] tracking-[0.02em] [writing-mode:vertical-rl] leading-none">Mon</span>
      <div className="grid grid-rows-7 auto-cols-[9px] grid-flow-col gap-[3px] shrink-0">
        {dots}
      </div>
    </div>
  );
}
