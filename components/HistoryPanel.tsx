import React, { useState } from 'react';
import { X, MessageSquare, Trash2, Clock, Plus, Edit2, Check, Key, Shield } from 'lucide-react';
import { Conversation } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenApiKeySettings: () => void; // New prop for opening API key settings
  isApiKeySelected: boolean; // New prop for API key status
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onRenameChat,
  onOpenApiKeySettings,
  isApiKeySelected,
}) => {
  if (!isOpen) return null;

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSaveEdit = (chatId: string) => {
    const newTitle = editTitle.trim();
    if (newTitle !== (conversations.find(c => c.id === chatId)?.title || '')) {
      onRenameChat(chatId, newTitle || 'Untitled Session');
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-[280px] md:max-w-xs bg-ui-panel h-full shadow-2xl flex flex-col animate-fade-in-left dark:bg-ui-dark-1 dark:text-white border-r border-ui-border dark:border-ui-dark-3 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-ui-border dark:border-ui-dark-3 flex items-center justify-between bg-ui-bg dark:bg-ui-dark-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold tracking-tight text-primary-87">Consultation History</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-tertiary-38 hover:text-primary-87"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Area */}
        <div className="p-4 border-b border-ui-border dark:border-ui-dark-3">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-brand-primary/20 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" /> 
            New Consultation
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 bg-ui-bg dark:bg-ui-dark-2 rounded-2xl flex items-center justify-center mb-4 border border-ui-border dark:border-ui-dark-3">
                <MessageSquare className="w-6 h-6 text-tertiary-38" />
              </div>
              <p className="text-xs font-medium text-secondary-60">No previous sessions found</p>
              <p className="text-[10px] text-tertiary-38 mt-1">Your health discussions will appear here.</p>
            </div>
          ) : (
            conversations
              .slice()
              .sort((a, b) => b.updatedAt - a.updatedAt) // Already sorted by date
              .map((chat) => (
                <div 
                  key={chat.id}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border-l-4 ${
                    activeChatId === chat.id 
                      ? 'bg-brand-primary-5 border-brand-primary dark:bg-brand-primary/10' 
                      : 'hover:bg-ui-bg dark:hover:bg-ui-dark-2 border-transparent'
                  }`}
                  onClick={() => { if (editingChatId !== chat.id) { onSelectChat(chat.id); onClose(); }}}
                >
                  <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeChatId === chat.id ? 'text-brand-primary' : 'text-tertiary-38'}`} />
                  
                  <div className="flex-1 min-w-0">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveEdit(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit(chat.id);
                          }
                        }}
                        className="w-full bg-ui-bg dark:bg-ui-dark-3 text-xs font-bold rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand-primary"
                        autoFocus
                      />
                    ) : (
                      <p className={`text-xs font-bold truncate ${activeChatId === chat.id ? 'text-brand-primary' : 'text-primary-87'}`}>
                        {chat.title || "Untitled Session"}
                      </p>
                    )}
                    <p className="text-[10px] text-tertiary-38 mt-0.5 flex items-center gap-1 font-medium">
                      {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      <span className="opacity-30">•</span>
                      {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {editingChatId === chat.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(chat.id);
                      }}
                      className="p-2 text-brand-primary hover:text-brand-success transition-all rounded-lg hover:bg-brand-success/10"
                      title="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditTitle(chat.title || '');
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-tertiary-38 hover:text-brand-primary transition-all rounded-lg hover:bg-brand-primary/10"
                        title="Rename session"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Permanentely delete this consultation session?")) {
                            onDeleteChat(chat.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-tertiary-38 hover:text-brand-error transition-all rounded-lg hover:bg-brand-error/10"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ui-border dark:border-ui-dark-3 bg-ui-bg dark:bg-ui-dark-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-tertiary-38 uppercase tracking-widest px-1">
            <span>{conversations.length} Session{conversations.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => { onOpenApiKeySettings(); onClose(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
              isApiKeySelected
                ? 'bg-brand-success/10 text-brand-success hover:bg-brand-success/20'
                : 'bg-brand-warning/10 text-brand-warning hover:bg-brand-warning/20'
            }`}
            title={isApiKeySelected ? "API Key Selected" : "API Key Not Selected"}
          >
            <Key className="w-3 h-3 stroke-[2.5px]" />
            <span>API Key</span>
            {!isApiKeySelected && (
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-brand-warning rounded-full ring-1 ring-white dark:ring-ui-dark-2" />
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInLeft { 
          from { transform: translateX(-100%); } 
          to { transform: translateX(0); } 
        }
        .animate-fade-in-left { 
          animation: fadeInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};