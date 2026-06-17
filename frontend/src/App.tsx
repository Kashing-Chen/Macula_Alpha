import React, { useEffect, useRef, useState } from 'react';
import { ChatList } from './pages/ChatList';
import { ChatDetail } from './pages/ChatDetail';
import { Profile } from './pages/Profile';
import { ProfileEdit } from './pages/ProfileEdit';
import { TabBar } from './components/TabBar';
import { api } from './api/client';

import type { ProfileEditSection } from './api/types';

export default function App() {
  const [currentPage, setCurrentPage] = useState('chat_list');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [batchEditing, setBatchEditing] = useState(false);
  const [profileEditSection, setProfileEditSection] = useState<ProfileEditSection>('info');
  const [showChatDetail, setShowChatDetail] = useState(false);
  const [chatDetailOpen, setChatDetailOpen] = useState(false);
  const [chatOpenToken, setChatOpenToken] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showTabBar =
    (currentPage === 'chat_list' || currentPage === 'profile') &&
    !(currentPage === 'chat_list' && batchEditing);

  const finalizeClose = () => {
    setShowChatDetail(false);
    setActiveConversationId(null);
    setListKey((k) => k + 1);
  };

  const openConversation = (id: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    setActiveConversationId(id);
    setCurrentPage('chat_detail');
    setChatDetailOpen(false);
    setShowChatDetail(true);
    setChatOpenToken((t) => t + 1);
  };

  const dismissChatDetail = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    setShowChatDetail(false);
    setChatDetailOpen(false);
    setActiveConversationId(null);
  };

  const closeConversation = () => {
    setChatDetailOpen(false);
    setCurrentPage('chat_list');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(finalizeClose, 350);
  };

  const handleChatDetailTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform' || chatDetailOpen || !showChatDetail) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    finalizeClose();
  };

  useEffect(() => {
    if (!showChatDetail) return;
    setChatDetailOpen(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setChatDetailOpen(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [showChatDetail, chatOpenToken]);

  const handleAddConversation = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const conversation = await api.createConversation();
      setListKey((k) => k + 1);
      openConversation(conversation.id);
    } catch (e) {
      console.error('Failed to create conversation:', e);
      alert(`创建对话失败：${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const openProfileEdit = (section: ProfileEditSection) => {
    setProfileEditSection(section);
    setCurrentPage('profile_edit');
  };

  const handleNavigate = (page: string) => {
    if (page !== 'chat_list') {
      setBatchEditing(false);
    }
    if (page === 'chat_list' && showChatDetail) {
      closeConversation();
      return;
    }
    if (page !== 'chat_list' && page !== 'chat_detail' && showChatDetail) {
      dismissChatDetail();
    }
    if (page === 'chat_list') {
      setListKey((k) => k + 1);
    }
    setCurrentPage(page);
  };

  return (
    <div className="min-h-dvh flex justify-center text-black font-sans bg-[#e5e5ea] sm:py-5 w-full">
      <div className="w-full max-w-[393px] min-h-[100dvh] sm:min-h-[852px] bg-white relative overflow-hidden flex flex-col sm:rounded-[40px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        
        {(currentPage === 'chat_list' || currentPage === 'chat_detail') && (
          <ChatList
            key={listKey}
            navigate={handleNavigate}
            openConversation={openConversation}
            onBatchEditingChange={setBatchEditing}
          />
        )}
        {showChatDetail && (currentPage === 'chat_list' || currentPage === 'chat_detail') && (
          <div
            className={`absolute inset-0 z-20 flex flex-col bg-white transition-transform duration-300 ease-out will-change-transform ${
              chatDetailOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            onTransitionEnd={handleChatDetailTransitionEnd}
          >
            <ChatDetail onBack={closeConversation} conversationId={activeConversationId} />
          </div>
        )}
        {currentPage === 'profile' && (
          <Profile navigate={handleNavigate} openProfileEdit={openProfileEdit} />
        )}
        {currentPage === 'profile_edit' && (
          <ProfileEdit navigate={handleNavigate} section={profileEditSection} />
        )}

        <div
          className={`transition-all duration-300 ease-out ${
            showTabBar
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          {(currentPage === 'chat_list' || currentPage === 'profile') && (
            <TabBar
              activeTab={currentPage}
              onTabChange={handleNavigate}
              onAdd={handleAddConversation}
              adding={creating}
            />
          )}
        </div>
        
      </div>
    </div>
  );
}
