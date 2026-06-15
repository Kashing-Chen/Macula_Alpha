import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../icons';
import { api } from '../api/client';
import type { Conversation, Message } from '../api/types';

interface ChatDetailProps {
  navigate: (page: string) => void;
  conversationId: string | null;
}

export function ChatDetail({ navigate, conversationId }: ChatDetailProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAiChat = conversation?.type === 'ai';

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getConversation(conversationId),
      api.getMessages(conversationId),
    ])
      .then(([conv, msgs]) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(msgs);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !conversationId || sending) return;

    // 乐观更新：先立即展示用户消息、清空输入框，再等待服务端（及大模型）响应
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      sender: 'me',
      text,
      time: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const result = await api.sendMessage(conversationId, text);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
        const next = [...withoutOptimistic, result.user];
        if (result.assistant) next.push(result.assistant);
        return next;
      });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#f2f2f7] w-full h-full relative">
      <div className="h-[54px] shrink-0" />
      <header className="relative flex items-center px-4 pb-2 shrink-0 min-h-[40px]">
        <button onClick={() => navigate('chat_list')} className="w-10 h-10 rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#1c1c1e] shrink-0 active:opacity-75">
          <Icons.ChevronLeft className="w-[20px] h-[20px] -ml-[2px]" />
        </button>
        {conversation?.title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold tracking-[-0.2px] pointer-events-none">{conversation.title}</h1>
        )}
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto px-3 pt-1 pb-[100px] scrollbar-hide flex flex-col gap-4">
        {loading && (
          <div className="text-center text-[12px] text-[#8e8e93] mt-2">加载中…</div>
        )}
        {error && (
          <div className="text-center text-[12px] text-[#ff3b30] mt-2 px-2">{error}</div>
        )}

        {!loading && isAiChat && messages.length === 0 && !error && (
          <div className="text-center text-[13px] text-[#8e8e93] mt-8 px-6 leading-[1.5]">
            发送消息开始与 AI 对话
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble key={msg.id} message={msg} showTime={i === 0} />
        ))}

        {sending && isAiChat && (
          <TypingIndicator />
        )}
      </main>

      <footer className="absolute bottom-0 left-0 right-0 flex items-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom,0)+24px)] pt-2.5 bg-[#f2f2f7]">
        <button className="w-9 h-9 border-none rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#8e8e93] cursor-pointer shrink-0 active:opacity-75">
          <Icons.Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-between h-[38px] px-3 pl-4 rounded-[19px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            placeholder="发消息"
            disabled={sending}
            className="flex-1 min-w-0 border-none outline-none bg-transparent text-[16px] text-[#1c1c1e] placeholder:text-[#c7c7cc] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="w-7 h-7 border-none bg-transparent flex items-center justify-center text-[#8e8e93] cursor-pointer shrink-0 active:opacity-75 disabled:opacity-40"
          >
            {draft.trim() ? <Icons.Send className="w-5 h-5 text-[#34c759]" /> : <Icons.Mic className="w-5 h-5" />}
          </button>
        </div>
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0)+6px)] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black rounded-[3px] pointer-events-none" />
      </footer>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start w-full mt-2">
      <div className="relative px-4 py-3 rounded-[18px] bg-[#e9e9eb] rounded-bl-[4px]">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-[#8e8e93] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-[#8e8e93] animate-pulse [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#8e8e93] animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function Bubble({ message, showTime }: { message: Message; showTime: boolean }) {
  const isMe = message.sender === 'me';

  if (isMe) {
    return (
      <div className="flex flex-col items-end w-full mt-2">
        <div className="relative p-[10px_14px] rounded-[18px] text-[16px] leading-[1.45] tracking-[-0.2px] max-w-[75%] bg-[#34c759] text-white rounded-br-[4px] text-left">
          <p className="relative z-10 m-0 whitespace-pre-wrap">{message.text}</p>
          <div className="absolute bottom-0 -right-[7px] w-[20px] h-[20px] bg-[#34c759] rounded-bl-[16px_10px]"></div>
          <div className="absolute bottom-0 -right-[10px] w-[10px] h-[20px] bg-[#f2f2f7] rounded-bl-[10px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start w-full">
      {showTime && message.time && (
        <div className="w-full text-center text-[12px] text-[#8e8e93] leading-[1.2] mb-2 mt-1.5">{formatTime(message.time)}</div>
      )}
      <div className="relative p-[10px_14px] rounded-[18px] text-[16px] leading-[1.45] tracking-[-0.2px] max-w-[90%] bg-[#e9e9eb] text-[#1c1c1e] rounded-bl-[4px]">
        <p className="relative z-10 m-0 whitespace-pre-wrap">{message.text}</p>
        <div className="absolute bottom-0 -left-[7px] w-[20px] h-[20px] bg-[#e9e9eb] rounded-br-[16px_10px]"></div>
        <div className="absolute bottom-0 -left-[10px] w-[10px] h-[20px] bg-[#f2f2f7] rounded-br-[10px]"></div>
      </div>
    </div>
  );
}

function formatTime(time: string) {
  if (time.includes('今天') || time.includes('星期') || time.includes('刚刚')) return time;
  try {
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return time;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return isToday ? `今天 ${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
  } catch {
    return time;
  }
}
