import React from 'react';
import { HeartPulse, Moon, Sun, Brain, History, Plus } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toggleMemory: () => void;
  toggleHistory: () => void;
  onNewChat: () => void;
  hasMemories: boolean;
  currentChatTitle: string; // New prop for dynamic chat title
}

export const Header: React.FC<HeaderProps> = ({ 
  theme, 
  toggleTheme, 
  toggleMemory, 
  toggleHistory,
  onNewChat,
  hasMemories,
  currentChatTitle, // Destructure new prop
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-ui-border px-3 sm:px-4 py-2 flex items-center justify-between sticky top-0 z-40 dark:bg-ui-dark-1/80 dark:border-ui-dark-3 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleHistory}
          className="p-2 rounded-lg hover:bg-ui-bg dark:hover:bg-ui-dark-2 transition-colors text-secondary-60"
          title="History"
        >
          <History className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="text-brand-primary">
            <HeartPulse className="w-5 h-5" />
          </div>
          {/* Display dynamic chat title */}
          <h1 className="text-[14px] font-bold tracking-tight hidden xs:block">{currentChatTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:opacity-90 text-white rounded-full text-[11px] font-bold transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        <div className="h-4 w-[1px] bg-ui-border dark:bg-ui-dark-3 mx-1"></div>

        <button
          onClick={toggleMemory}
          className={`p-2 rounded-lg transition-colors relative ${
            hasMemories 
              ? 'text-brand-primary' 
              : 'text-tertiary-38 hover:bg-ui-bg dark:hover:bg-ui-dark-2'
          }`}
          title="Memories"
        >
          <Brain className="w-5 h-5" />
          {hasMemories && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-primary rounded-full ring-2 ring-white dark:ring-ui-dark-1" />
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-tertiary-38 hover:bg-ui-bg dark:hover:bg-ui-dark-2 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};