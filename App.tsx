import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { createChatSession, extractSources, sendMultimodalMessage } from './services/gemini';
import { Message, Role, HealthFact, Conversation, GroundingSource } from './types';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamTokenRef = useRef(0);

  useEffect(() => { localStorage.setItem('chat_conversations', JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { localStorage.setItem('health_memories', JSON.stringify(memories)); }, [memories]);
  useEffect(() => { if (activeChatId) localStorage.setItem('active_chat_id', activeChatId); }, [activeChatId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeChatId) || null;
  }, [conversations, activeChatId]);

  const memoryTexts = useMemo(() => memories.map((m) => `[${m.category}] ${m.text}`), [memories]);

  const initChat = (targetId: string | null) => {
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
    }
  };

  useEffect(() => { if (activeChatId) initChat(activeChatId); }, [activeChatId, memoryTexts.join('||')]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); });
  };

  useEffect(() => { scrollToBottom(); }, [activeConversation?.messages.length, isBotGenerating]);

  const startNewChat = () => {
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
  };

  useEffect(() => {
    if (conversations.length === 0) startNewChat();
    else if (!activeChatId) setActiveChatId(conversations[0]?.id);
  }, []);

  const handleSendMessage = async (text: string, image?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (!activeChatId || !chatSession) return;

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
      const resultStream = await sendMultimodalMessage(chatSession, trimmed, image);
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
      if (myStreamToken === streamTokenRef.current) setAppError(error?.message || "Stream error");
    } finally {
      if (myStreamToken === streamTokenRef.current) { setIsLoading(false); setIsBotGenerating(false); }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-ui-bg dark:bg-ui-dark-0 transition-colors">
      <Header
        theme={theme}
        toggleTheme={() => setTheme((p) => (p === 'light' ? 'dark' : 'light'))}
        toggleMemory={() => setIsMemoryOpen((v) => !v)}
        toggleHistory={() => setIsHistoryOpen((v) => !v)}
        onNewChat={startNewChat}
        hasMemories={memories.length > 0}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onDeleteChat={(id) => setConversations(p => p.filter(c => c.id !== id))}
        onNewChat={startNewChat}
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
    </div>
  );
}