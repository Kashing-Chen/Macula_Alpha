import React, { useState } from 'react';
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

  const showTabBar =
    (currentPage === 'chat_list' || currentPage === 'profile') &&
    !(currentPage === 'chat_list' && batchEditing);

  const openConversation = (id: string) => {
    setActiveConversationId(id);
    setCurrentPage('chat_detail');
  };

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
    if (page === 'chat_list') {
      setListKey((k) => k + 1);
    }
    setCurrentPage(page);
  };

  return (
    <div className="min-h-dvh flex justify-center text-black font-sans bg-[#e5e5ea] sm:py-5 w-full">
      <div className="w-full max-w-[393px] min-h-[100dvh] sm:min-h-[852px] bg-white relative overflow-hidden flex flex-col sm:rounded-[40px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        
        {currentPage === 'chat_list' && (
          <ChatList
            key={listKey}
            navigate={handleNavigate}
            openConversation={openConversation}
            onBatchEditingChange={setBatchEditing}
          />
        )}
        {currentPage === 'chat_detail' && (
          <ChatDetail navigate={handleNavigate} conversationId={activeConversationId} />
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
