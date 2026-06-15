import React, { useEffect, useState } from 'react';
import { Icons } from '../icons';
import { api } from '../api/client';
import type { Conversation, Story } from '../api/types';

const pillShadow = {
  boxShadow:
    'inset 0 0.5px 0 rgba(255, 255, 255, 0.95), 0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
};

interface ChatListProps {
  navigate: (page: string) => void;
  openConversation: (id: string) => void;
  onBatchEditingChange?: (editing: boolean) => void;
}

export function ChatList({ openConversation, onBatchEditingChange }: ChatListProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getStories(), api.getConversations()])
      .then(([storyData, convData]) => {
        if (cancelled) return;
        setStories(storyData);
        setConversations(convData);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEditing = () => {
    setEditing((prev) => {
      const next = !prev;
      onBatchEditingChange?.(next);
      if (!next) setSelectedIds(new Set());
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0 || deleting) return;
    setDeleting(true);
    try {
      await api.deleteConversations([...selectedIds]);
      setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setEditing(false);
      onBatchEditingChange?.(false);
    } catch (e) {
      alert(`删除失败：${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white w-full h-full">
      <div className="h-[54px] shrink-0" />
      <header className="relative flex items-center justify-between px-4 pb-3 shrink-0">
        <button
          onClick={toggleEditing}
          className="h-9 px-4 border-none rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.1)] text-[15px] font-medium text-[#1c1c1e] cursor-pointer shrink-0 transition-all duration-200 active:scale-95"
        >
          {editing ? '完成' : '编辑'}
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold tracking-[-0.2px] pointer-events-none">
          通话
        </h1>
        <button className="w-10 h-10 border-none rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.1)] flex items-center justify-center cursor-pointer text-[#1c1c1e] shrink-0">
          <Icons.Search className="w-[18px] h-[18px]" />
        </button>
      </header>

      <main
        className={`flex-1 overflow-y-auto scrollbar-hide transition-[padding] duration-300 ease-out ${
          editing ? 'pb-[100px]' : 'pb-[120px]'
        }`}
      >
        <section className="flex justify-center flex-wrap items-start gap-7 px-5 pt-2 pb-5 shrink-0">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-b from-[#c8d8f0] to-[#a8bce4] flex items-center justify-center shrink-0">
                <Icons.Avatar className="w-[55%] h-[55%] fill-white opacity-95" />
              </div>
              <span className="text-[11px] text-[#8e8e93] max-w-[90px] text-center leading-[1.2]">
                {story.title}
              </span>
            </div>
          ))}
        </section>

        {loading && (
          <div className="px-4 py-6 text-center text-[14px] text-[#8e8e93]">加载中…</div>
        )}
        {error && (
          <div className="px-4 py-6 text-center text-[14px] text-[#ff3b30]">加载失败：{error}</div>
        )}

        {conversations.map((conv) => (
          <MessageItem
            key={conv.id}
            title={conv.title}
            time={conv.time}
            preview={conv.preview}
            editing={editing}
            selected={selectedIds.has(conv.id)}
            onToggleSelect={() => toggleSelect(conv.id)}
            onClick={() => openConversation(conv.id)}
          />
        ))}
      </main>

      <div
        className={`absolute bottom-[calc(env(safe-area-inset-bottom,0)+20px)] right-5 z-20 transition-all duration-300 ease-out ${
          editing
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
        }`}
      >
        <button
          onClick={handleDelete}
          disabled={selectedIds.size === 0 || deleting}
          className="relative w-[62px] h-[62px] border-none rounded-full flex items-center justify-center shrink-0 bg-white/55 backdrop-blur-[40px] saturate-[180%] border-[0.5px] border-white/65 cursor-pointer overflow-hidden active:opacity-75 disabled:opacity-40 transition-opacity duration-200"
          style={pillShadow}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-[inherit]" />
          <Icons.Trash className="relative z-10 w-[22px] h-[22px] text-[#1c1c1e]" />
        </button>
      </div>
    </div>
  );
}

function CircleCheckbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200 ${
        checked
          ? 'bg-[#418DF7] border-[#418DF7] scale-100'
          : 'bg-transparent border-[#c7c7cc] scale-100'
      }`}
    >
      <svg
        className={`w-[11px] h-[11px] text-white transition-all duration-200 ${
          checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="2.5 6 5 8.5 9.5 3.5" />
      </svg>
    </div>
  );
}

function MessageItem({
  title,
  time,
  preview,
  editing,
  selected,
  onToggleSelect,
  onClick,
}: {
  title: string;
  time: string;
  preview: string;
  editing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  const handleClick = () => {
    if (editing) onToggleSelect();
    else onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-2.5 border-b-[0.5px] border-[#3c3c431f] cursor-pointer transition-colors duration-150 ${
        editing && selected ? 'bg-[#418DF7]/8' : 'active:bg-black/5'
      }`}
    >
      <div
        className={`overflow-hidden transition-all duration-300 ease-out flex items-center self-center shrink-0 ${
          editing ? 'w-[22px] opacity-100 mr-0' : 'w-0 opacity-0 -mr-3'
        }`}
      >
        <CircleCheckbox checked={selected} />
      </div>

      <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-b from-[#c8d8f0] to-[#a8bce4] flex items-center justify-center shrink-0 transition-transform duration-300 ease-out">
        <Icons.Avatar className="w-[55%] h-[55%] fill-white opacity-95" />
      </div>
      <div className="flex-1 min-w-0 pt-[2px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[16px] font-semibold tracking-[-0.3px] text-black">{title}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="text-[15px] text-[#8e8e93]">{time}</span>
            <span
              className={`text-[#c7c7cc] text-[14px] font-light -mt-[1px] transition-all duration-300 ${
                editing ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              ›
            </span>
          </div>
        </div>
        <div className="flex items-start gap-[6px] text-[15px] text-[#8e8e93] leading-[1.35]">
          <span className="line-clamp-2">{preview}</span>
        </div>
      </div>
    </div>
  );
}
