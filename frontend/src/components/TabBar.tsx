import React from 'react';
import { Icons } from '../icons';

const pillShadow = {
  boxShadow: 'inset 0 0.5px 0 rgba(255, 255, 255, 0.95), 0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)'
};

export function TabBar({
  activeTab,
  onTabChange,
  onAdd,
  adding,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAdd?: () => void;
  adding?: boolean;
}) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-5 pb-[calc(env(safe-area-inset-bottom,0)+14px)] pointer-events-none z-10">
      
      <div 
        className="flex-1 flex items-center justify-between h-[62px] rounded-[31px] p-[4px_6px] bg-white/55 backdrop-blur-[40px] saturate-[180%] border-[0.5px] border-white/65 pointer-events-auto relative overflow-hidden active"
        style={pillShadow}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-[inherit]" />
        
        <button 
          onClick={() => onTabChange('chat_list')}
          className={`relative z-10 flex flex-col items-center justify-center gap-[3px] flex-1 h-[54px] border-none bg-transparent cursor-pointer py-1 rounded-[22px] min-w-0 transition-colors duration-200 ${activeTab === 'chat_list' ? 'bg-[#78788029]' : ''}`}
        >
          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 ${activeTab === 'chat_list' ? 'bg-[#007aff] text-white' : 'bg-[#1c1c1e] text-white'}`}>
            <Icons.TabChats className={`w-[17px] h-[17px] ${activeTab === 'chat_list' ? 'w-[18px] h-[18px]' : ''}`} />
          </div>
          <span className={`text-[11px] leading-[1.1] whitespace-nowrap tracking-[-0.1px] ${activeTab === 'chat_list' ? 'text-[#007aff] font-medium' : 'text-[#1c1c1e]'}`}>对话</span>
        </button>

        <button className="relative z-10 flex flex-col items-center justify-center gap-[3px] flex-1 h-[54px] border-none bg-transparent cursor-pointer py-1 rounded-[22px] min-w-0 transition-colors duration-200">
          <div className="w-[28px] h-[28px] flex items-center justify-center text-[#1c1c1e]">
             <Icons.TabGoals className="w-[24px] h-[24px]" />
          </div>
          <span className="text-[11px] leading-[1.1] whitespace-nowrap tracking-[-0.1px] text-[#1c1c1e]">目标</span>
        </button>

        <button 
          onClick={() => onTabChange('profile')}
          className={`relative z-10 flex flex-col items-center justify-center gap-[3px] flex-1 h-[54px] border-none bg-transparent cursor-pointer py-1 rounded-[22px] min-w-0 transition-colors duration-200 ${activeTab === 'profile' ? 'bg-[#78788029]' : ''}`}
        >
          <div className={`flex items-center justify-center shrink-0 ${activeTab === 'profile' ? 'w-[30px] h-[30px] rounded-full bg-[#007aff] text-white' : 'bg-transparent text-[#1c1c1e] w-[28px] h-[28px]'}`}>
            <Icons.TabProfile className={activeTab === 'profile' ? 'w-[18px] h-[18px]' : 'w-[24px] h-[24px]'} />
          </div>
           <span className={`text-[11px] leading-[1.1] whitespace-nowrap tracking-[-0.1px] ${activeTab === 'profile' ? 'text-[#007aff] font-medium' : 'text-[#1c1c1e]'}`}>我的</span>
        </button>

      </div>

      <button
        onClick={onAdd}
        disabled={adding}
        className="relative z-10 w-[62px] h-[62px] border-none rounded-full flex items-center justify-center text-[#1c1c1e] shrink-0 bg-white/55 backdrop-blur-[40px] saturate-[180%] border-[0.5px] border-white/65 pointer-events-auto overflow-hidden active:opacity-75 disabled:opacity-50"
        style={pillShadow}
      >
         <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-[inherit]" />
         <Icons.Plus className="relative z-10 w-[22px] h-[22px]" />
      </button>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0)+4px)] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black rounded-[3px] pointer-events-none" />
    </nav>
  );
}
