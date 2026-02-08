import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Chat, GenerateContentResponse } from '@google/genai';
import { Header } from './components/Header';
import { Disclaimer } from './components/Disclaimer';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { InputArea } from './components/InputArea';
import { ErrorBanner } from './components/ErrorBanner';
import { MemoryPanel } from './components/MemoryPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { ApiKeySelectionDialog } from './components/ApiKeySelectionDialog';
import { createChatSession, extractSources, sendMultimodalMessage } from './services/gemini';
import { Message, Role, HealthFact, Conversation, GroundingSource } from './types';
import { APP_NAME } from './constants'; // Import APP_NAME

const WELCOME_TEXT =
  "How can I help you with your health and wellness today? \n\nI can analyze symptoms, provide nutrition tips, or explain general health topics.";

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('chat_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          messages: (c.messages || []).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    return localStorage.getItem('active_chat_id');
  });

  const [memories, setMemories] = useState<HealthFact[]>(() => {
    const saved = localStorage.getItem('health_memories');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({ ...m, createdAt: m.createdAt || Date.now() }));
    } catch (e) {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isBotGenerating, setIsBotGenerating] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  // API Key Selection State
  const [isApiKeySelected, setIsApiKeySelected] = useState(true); // Assume true initially for default key
  const [showApiKeySelectionDialog, setShowApiKeySelectionDialog] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamTokenRef = useRef(0);

  useEffect(() => { localStorage.setItem('chat_conversations', JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { localStorage.setItem('health_memories', JSON.stringify(memories)); }, [memories]);
  useEffect(() => { if (activeChatId) localStorage.setItem('active_chat_id', activeChatId); }, [activeChatId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check API key status on mount
  useEffect(() => {
    const checkKeyStatus = async () => {
      // Ensure window.aistudio is available and has the necessary method
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
        if (!hasKey) {
          setShowApiKeySelectionDialog(true);
        }
      } else {
        // If aistudio is not available, assume default key is used, and user cannot select custom key
        setIsApiKeySelected(true); 
      }
    };
    checkKeyStatus();
  }, []);

  const handleOpenApiKeySelection = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // As per guidelines, assume success and proceed
        setIsApiKeySelected(true);
        setShowApiKeySelectionDialog(false);
        setAppError(null); // Clear any previous API key related errors
        // Re-initialize chat session to ensure new API key is picked up
        if (activeChatId) initChat(activeChatId); 
      } catch (error: any) {
        setAppError(`Failed to select API key: ${error.message}`);
        setIsApiKeySelected(false);
        setShowApiKeySelectionDialog(true); // Keep dialog open on selection failure
      }
    } else {
      setAppError("API key selection is not available in this environment.");
    }
  }, [activeChatId, conversations, memories]); // Add relevant dependencies

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeChatId) || null;
  }, [conversations, activeChatId]);

  const memoryTexts = useMemo(() => memories.map((m) => `[${m.category}] ${m.text}`), [memories]);

  const initChat = useCallback((targetId: string | null) => {
    if (!targetId) return;
    try {
      setAppError(null);
      const targetConv = conversations.find((c) => c.id === targetId);
      const history = targetConv
        ? targetConv.messages
            .filter((m) => !m.isStreaming && !m.id.startsWith('init'))
            .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
        : [];
      setChatSession(createChatSession(memoryTexts, history));
    } catch (error: any) {
      setAppError(`Init failed: ${error.message}`);
      setChatSession(null);
      // If chat session init fails, it might be due to API key
      if (error?.message?.includes("API key is missing") || error?.message?.includes("Invalid API key")) {
        setIsApiKeySelected(false);
        setShowApiKeySelectionDialog(true);
      }
    }
  }, [conversations, memoryTexts]);

  useEffect(() => { if (activeChatId) initChat(activeChatId); }, [activeChatId, memoryTexts.join('||'), initChat]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); });
  };

  useEffect(() => { scrollToBottom(); }, [activeConversation?.messages.length, isBotGenerating]);

  const startNewChat = useCallback(() => {
    const newId = uuidv4();
    const newConv: Conversation = {
      id: newId,
      title: 'New Session',
      updatedAt: Date.now(),
      messages: [{ id: 'init-' + Date.now(), role: Role.MODEL, text: WELCOME_TEXT, timestamp: new Date() }],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveChatId(newId);
    setAppError(null);
  }, []);

  useEffect(() => {
    if (conversations.length === 0) startNewChat();
    else if (!activeChatId) setActiveChatId(conversations[0]?.id);
  }, [conversations, activeChatId, startNewChat]);

  const handleSendMessage = async (text: string, image?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (!activeChatId || !chatSession) return;
    if (!isApiKeySelected && window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      setShowApiKeySelectionDialog(true);
      setAppError("Please select an API key to continue.");
      return;
    }

    setAppError(null);
    const userMsgId = uuidv4();
    const botMsgId = uuidv4();
    const timestamp = new Date();

    setConversations((prev) => prev.map((c) => {
      if (c.id === activeChatId) {
        return {
          ...c,
          title: c.messages.length <= 1 ? trimmed.slice(0, 30) || 'Image Analysis' : c.title,
          updatedAt: Date.now(),
          messages: [...c.messages, { id: userMsgId, role: Role.USER, text: trimmed, image, timestamp }],
        };
      }
      return c;
    }));

    setIsLoading(true);
    setIsBotGenerating(true);
    const myStreamToken = ++streamTokenRef.current;

    try {
      // Re-create chat session to ensure latest API key is used
      const currentChatSession = createChatSession(memoryTexts, activeConversation?.messages
        .filter((m) => !m.isStreaming && !m.id.startsWith('init'))
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] })) || []);

      const resultStream = await sendMultimodalMessage(currentChatSession, trimmed, image);
      let fullText = '';
      let extractedSources: GroundingSource[] = [];

      for await (const chunk of resultStream) {
        if (myStreamToken !== streamTokenRef.current) break;
        const chunkResponse = chunk as GenerateContentResponse;
        fullText += chunkResponse.text ?? '';
        
        const sources = extractSources(chunkResponse);
        if (sources.length) {
          const unique = sources.filter(s => !extractedSources.some(es => es.uri === s.uri));
          extractedSources = [...extractedSources, ...unique];
        }

        setConversations((prev) => prev.map((c) => {
          if (c.id !== activeChatId) return c;
          const updatedMessages = [...c.messages];
          const botMsgIndex = updatedMessages.findIndex((m) => m.id === botMsgId);
          if (botMsgIndex === -1) {
            updatedMessages.push({ id: botMsgId, role: Role.MODEL, text: fullText, isStreaming: true, timestamp: new Date(), sources: extractedSources } as Message);
          } else {
            updatedMessages[botMsgIndex] = { ...updatedMessages[botMsgIndex], text: fullText, sources: extractedSources } as Message;
          }
          return { ...c, messages: updatedMessages };
        }));
      }

      if (myStreamToken === streamTokenRef.current) {
        setConversations((prev) => prev.map((c) => c.id === activeChatId ? { ...c, messages: c.messages.map((m) => m.id === botMsgId ? { ...m, isStreaming: false } : m) } : c));
      }
    } catch (error: any) {
      if (myStreamToken === streamTokenRef.current) {
        const errorMessage = error?.message || "Stream error";
        setAppError(errorMessage);
        if (errorMessage.includes("Requested entity was not found.")) {
          setIsApiKeySelected(false);
          setShowApiKeySelectionDialog(true);
        }
      }
    } finally {
      if (myStreamToken === streamTokenRef.current) { setIsLoading(false); setIsBotGenerating(false); }
    }
  };

  const handleRenameChat = useCallback((id: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, title: newTitle, updatedAt: Date.now() } : conv
      )
    );
  }, []);

  return (
    <div className="flex flex-col h-screen bg-ui-bg dark:bg-ui-dark-0 transition-colors">
      <Header
        theme={theme}
        toggleTheme={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
        toggleMemory={() => setIsMemoryOpen((v) => !v)}
        toggleHistory={() => setIsHistoryOpen((v) => !v)}
        onNewChat={startNewChat}
        hasMemories={memories.length > 0}
        currentChatTitle={activeConversation?.title || APP_NAME} // Pass dynamic title
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onDeleteChat={(id) => setConversations(p => p.filter(c => c.id !== id))}
        onNewChat={startNewChat}
        onRenameChat={handleRenameChat}
        onOpenApiKeySettings={() => setShowApiKeySelectionDialog(true)}
        isApiKeySelected={isApiKeySelected}
      />

      <MemoryPanel
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onAddMemory={(f) => setMemories((p) => [...p, { ...f, id: uuidv4(), createdAt: Date.now() }])}
        onRemoveMemory={(id) => setMemories((p) => p.filter((m) => m.id !== id))}
        onUpdateMemory={(f) => setMemories((p) => p.map((m) => (m.id === f.id ? { ...m, ...f } : m)))}
        onClearHistory={() => { if(confirm('Reset all data?')) { setConversations([]); setMemories([]); localStorage.clear(); startNewChat(); } }}
        onExport={() => {}}
        onRestore={async () => {}}
      />

      <Disclaimer />
      {appError && <ErrorBanner message={appError} onDismiss={() => setAppError(null)} />}

      <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          {activeConversation?.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRateMessage={(id, r) => setConversations(p => p.map(c => ({...c, messages: c.messages.map(m => m.id === id ? {...m, rating: m.rating === r ? undefined : r} : m)})))}
              onRemoveMessage={(id) => setConversations(p => p.map(c => ({...c, messages: c.messages.filter(m => m.id !== id)})))}
            />
          ))}
          {isBotGenerating && <TypingIndicator />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      <InputArea
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        showSuggestions={(activeConversation?.messages.length || 0) < 3}
      />

      {showApiKeySelectionDialog && (
        <ApiKeySelectionDialog
          isOpen={showApiKeySelectionDialog}
          onClose={() => setShowApiKeySelectionDialog(false)}
          onSelectKey={handleOpenApiKeySelection}
        />
      )}
    </div>
  );
}