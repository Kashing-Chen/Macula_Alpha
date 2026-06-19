import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../icons';
import { api } from '../api/client';
import { UserAvatarView } from '../components/UserAvatarView';
import type { UserAvatar } from '../api/types';

type EditField = 'name' | 'birthDate' | 'location' | 'lifeVision';

function formatBirthDateDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

function composeUserInfo(fields: {
  name: string;
  birthDate?: string;
  location?: string;
  lifeVision?: string;
  chaseLifeVision?: boolean;
}): string {
  const parts: string[] = [];
  if (fields.name) parts.push(`我的名字是${fields.name}。`);
  if (fields.birthDate) parts.push(`我出生于${formatBirthDateDisplay(fields.birthDate)}。`);
  if (fields.location) parts.push(`我现在住在${fields.location}。`);
  if (fields.chaseLifeVision && fields.lifeVision) {
    parts.push(`我的人生愿景是${fields.lifeVision}。`);
  }
  return parts.join('\n\n');
}

interface ProfileInfoProps {
  navigate: (page: string) => void;
}

export function ProfileInfo({ navigate }: ProfileInfoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [location, setLocation] = useState('');
  const [chaseLifeVision, setChaseLifeVision] = useState(true);
  const [lifeVision, setLifeVision] = useState('');
  const [avatar, setAvatar] = useState<UserAvatar>({ type: 'gradient', from: '#c8d8f0', to: '#a8bce4' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getUser()
      .then((user) => {
        if (cancelled) return;
        setName(user.name ?? '');
        setBirthDate(user.birthDate ?? '');
        setLocation(user.location ?? '');
        setChaseLifeVision(user.chaseLifeVision ?? true);
        setLifeVision(user.lifeVision ?? user.bio ?? '');
        setAvatar(user.avatar ?? { type: 'gradient', from: '#c8d8f0', to: '#a8bce4' });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBack = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateUser({
        name,
        birthDate: birthDate || undefined,
        location: location || undefined,
        chaseLifeVision,
        lifeVision: lifeVision || undefined,
        bio: lifeVision || undefined,
        avatar,
        info: composeUserInfo({ name, birthDate, location, lifeVision, chaseLifeVision }),
      });
      navigate('profile');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const openEdit = (field: EditField) => {
    const values: Record<EditField, string> = {
      name,
      birthDate,
      location,
      lifeVision,
    };
    setDraft(values[field]);
    setEditField(field);
  };

  const confirmEdit = () => {
    if (!editField) return;
    const trimmed = draft.trim();
    switch (editField) {
      case 'name':
        setName(trimmed);
        break;
      case 'birthDate':
        setBirthDate(draft);
        break;
      case 'location':
        setLocation(trimmed);
        break;
      case 'lifeVision':
        setLifeVision(trimmed);
        break;
    }
    setEditField(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar({ type: 'image', url: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const editLabels: Record<EditField, string> = {
    name: '姓名',
    birthDate: '出生日期',
    location: '所在地',
    lifeVision: '人生愿景',
  };

  return (
    <div className="flex flex-col bg-[#f2f2f7] w-full h-full relative">
      <div className="h-[54px] shrink-0" />
      <header className="relative flex items-center px-4 pb-2 shrink-0 min-h-[48px]">
        <button
          onClick={handleBack}
          disabled={saving}
          className="w-10 h-10 border-none rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer text-[#1c1c1e] shrink-0 active:opacity-75 z-10 disabled:opacity-50"
        >
          <Icons.ChevronLeft className="w-[20px] h-[20px] -ml-[2px]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-[#1c1c1e] tracking-[-0.2px] pointer-events-none">
          个人信息
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-[34px] flex flex-col gap-[22px] scrollbar-hide">
        <section className="flex flex-col items-center pt-2 pb-1">
          <div className="mb-3">
            <UserAvatarView avatar={avatar} name={name} size={120} iconSize={56} />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || saving}
            className="border-none bg-[rgba(0,122,255,0.12)] text-[#007aff] text-[15px] font-medium px-[18px] py-1.5 rounded-full cursor-pointer active:opacity-70 disabled:opacity-50"
          >
            更改
          </button>
        </section>

        <section>
          <div className="bg-white rounded-2xl overflow-hidden">
            <InfoRow label="姓名" value={name} onClick={() => openEdit('name')} />
            <Divider />
            <InfoRow label="出生日期" value={formatBirthDateDisplay(birthDate)} onClick={() => openEdit('birthDate')} />
            <Divider />
            <InfoRow label="所在地" value={location} onClick={() => openEdit('location')} chevron="updown" />
          </div>
        </section>

        <section>
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between min-h-[50px] px-4 py-3">
              <span className="text-[17px] text-[#1c1c1e] tracking-[-0.2px]">追逐人生愿景</span>
              <label className="relative inline-flex shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chaseLifeVision}
                  onChange={(e) => setChaseLifeVision(e.target.checked)}
                  disabled={loading || saving}
                  className="absolute opacity-0 w-0 h-0"
                />
                <span
                  className={`block w-[51px] h-[31px] rounded-full transition-colors duration-200 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow-[0_2px_6px_rgba(0,0,0,0.15)] after:transition-transform after:duration-200 ${
                    chaseLifeVision
                      ? 'bg-[#34c759] after:translate-x-5'
                      : 'bg-[#e9e9ea] after:translate-x-0'
                  }`}
                />
              </label>
            </div>
            <Divider />
            <InfoRow label="人生愿景" value={lifeVision} onClick={() => openEdit('lifeVision')} />
          </div>
        </section>

        {error && <p className="text-[13px] text-[#ff3b30] text-center px-4">保存失败：{error}</p>}
      </main>

      <div className="shrink-0 h-[34px] relative pointer-events-none before:absolute before:bottom-[8px] before:left-1/2 before:-translate-x-1/2 before:w-[134px] before:h-[5px] before:bg-black before:rounded-[3px] before:opacity-[0.18]" />

      {editField && (
        <EditSheet
          title={editLabels[editField]}
          value={draft}
          onChange={setDraft}
          onCancel={() => setEditField(null)}
          onConfirm={confirmEdit}
          multiline={editField === 'lifeVision'}
          inputType={editField === 'birthDate' ? 'date' : 'text'}
        />
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  onClick,
  chevron = 'right',
}: {
  label: string;
  value: string;
  onClick: () => void;
  chevron?: 'right' | 'updown';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full min-h-[50px] px-4 py-3 border-none bg-transparent text-left cursor-pointer active:bg-black/[0.04]"
    >
      <span className="text-[17px] text-[#1c1c1e] tracking-[-0.2px] shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0 ml-3">
        <span className="text-[17px] text-[#8e8e93] tracking-[-0.2px] truncate">{value}</span>
        {chevron === 'updown' ? (
          <Icons.ChevronUpDown className="w-4 h-4 text-[#c7c7cc] shrink-0" />
        ) : (
          <Icons.ChevronRight className="w-[14px] h-[14px] text-[#c7c7cc] shrink-0" />
        )}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="h-[0.5px] bg-[rgba(60,60,67,0.18)] ml-4" />;
}

function EditSheet({
  title,
  value,
  onChange,
  onCancel,
  onConfirm,
  multiline,
  inputType,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  multiline?: boolean;
  inputType?: 'text' | 'date';
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-t-[20px] px-4 pt-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={onCancel} className="text-[17px] text-[#007aff] border-none bg-transparent cursor-pointer">
            取消
          </button>
          <span className="text-[17px] font-semibold text-[#1c1c1e]">{title}</span>
          <button type="button" onClick={onConfirm} className="text-[17px] font-semibold text-[#007aff] border-none bg-transparent cursor-pointer">
            完成
          </button>
        </div>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            rows={5}
            className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-[16px] text-[#1c1c1e] outline-none resize-none focus:border-[#007aff]"
            placeholder={`填写${title}…`}
          />
        ) : inputType === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-[16px] text-[#1c1c1e] outline-none focus:border-[#007aff]"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-[16px] text-[#1c1c1e] outline-none focus:border-[#007aff]"
            placeholder={`填写${title}…`}
          />
        )}
      </div>
    </div>
  );
}
