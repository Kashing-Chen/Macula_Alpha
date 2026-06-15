import React, { useEffect, useState } from 'react';
import { Icons } from '../icons';
import { api } from '../api/client';
import type { ProfileEditSection } from '../api/types';
import { PROFILE_SECTIONS } from '../profileSections';

interface ProfileEditProps {
  navigate: (page: string) => void;
  section: ProfileEditSection;
}

export function ProfileEdit({ navigate, section }: ProfileEditProps) {
  const config = PROFILE_SECTIONS[section];
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getUser()
      .then((user) => {
        if (cancelled) return;
        const value = user[config.field];
        setContent(typeof value === 'string' ? value : '');
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [section, config.field]);

  const handleBack = async () => {
    setSaving(true);
    try {
      await api.updateUser({ [config.field]: content });
      navigate('profile');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#f2f2f4] w-full h-full relative">
      <div className="h-[54px] shrink-0" />
      <header className="relative flex items-center px-4 pb-2 shrink-0 min-h-[48px]">
        <button onClick={handleBack} disabled={saving} className="w-10 h-10 border-none rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer text-[#1c1c1e] shrink-0 active:opacity-75 z-10 disabled:opacity-50">
          <Icons.ChevronLeft className="w-[20px] h-[20px] -ml-[2px]" />
        </button>
        <h1 className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold text-[#1c1c1e] tracking-[-0.2px] pointer-events-none mt-3">{config.title}</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-1 pb-[34px] scrollbar-hide">
        <section className="bg-white rounded-[20px] shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-4">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading || saving}
            className="w-full min-h-[280px] border-none resize-none bg-transparent outline-none text-[16px] leading-[1.5] tracking-[-0.2px] text-[#1c1c1e] placeholder:text-[#aeaeb2]" 
            placeholder={loading ? '加载中…' : config.placeholder} 
            rows={12} 
          />
          {config.hint && (
            <p className="text-[13px] text-[#8e8e93] mt-3 leading-[1.45]">{config.hint}</p>
          )}
          {error && <p className="text-[13px] text-[#ff3b30] mt-2">保存失败：{error}</p>}
        </section>
      </main>

      <div className="shrink-0 h-[34px] relative pointer-events-none before:absolute before:bottom-[8px] before:left-1/2 before:-translate-x-1/2 before:w-[134px] before:h-[5px] before:bg-black before:rounded-[3px] before:opacity-[0.18]" />
    </div>
  );
}
