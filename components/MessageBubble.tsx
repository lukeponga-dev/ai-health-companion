import React, { useState, useRef, useEffect } from 'react';
import { Role, Message } from '../types';
import { User, Bot, ExternalLink, Volume2, Square, Loader2, ThumbsUp, ThumbsDown, X, Copy, Check } from 'lucide-react';
import { generateSpeechChunks, decode, decodeAudioData } from '../services/gemini';

interface MessageBubbleProps {
  message: Message;
  onRateMessage: (messageId: string, rating: 'up' | 'down') => void;
  onRemoveMessage: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRateMessage, onRemoveMessage }) => {
  const isUser = message.role === Role.USER;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null); 
  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]); 
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing context:", e));
      }
    };
  }, [message.id]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(2000));
  };

  const fetchAudio = async (): Promise<AudioBuffer[]> => {
    setIsAudioLoading(true);
    setTtsError(null);
    try {
      const b64Chunks = await generateSpeechChunks(message.text);
      if (b64Chunks.length === 0) throw new Error("No speech content generated.");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      const ctx = audioContextRef.current;
      const buffers = await Promise.all(
        b64Chunks.map(b64 => decodeAudioData(decode(b64), ctx, 24000, 1))
      );
      setAudioBuffers(buffers);
      return buffers;
    } catch (error: any) {
      setTtsError(error.message || "Failed to load audio");
      return [];
    } finally {
      setIsAudioLoading(false);
    }
  };

  const stopAudio = () => {
    currentSourcesRef.current.forEach(src => {
      try { src.stop(); } catch(e) {}
    });
    currentSourcesRef.current = [];
    setIsPlaying(false);
  };

  const handleTTS = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (isAudioLoading) return;
    let buffers = audioBuffers;
    if (buffers.length === 0 || ttsError) {
      buffers = await fetchAudio();
    }
    if (buffers.length === 0) return;
    setIsPlaying(true);
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    let nextStartTime = ctx.currentTime;
    const sources: AudioBufferSourceNode[] = [];
    buffers.forEach((buffer, index) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(nextStartTime);
      nextStartTime += buffer.duration;
      sources.push(source);
      if (index === buffers.length - 1) {
        source.onended = () => {
          setIsPlaying(false);
        };
      }
    });
    currentSourcesRef.current = sources;
  };

  // Helper function for inline parsing (bold, inline code)
  const parseInline = (text: string) => {
    // Regex to capture bold (**...**) or inline code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g); 
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-primary-87">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={j} className="bg-ui-bg dark:bg-ui-dark-3 rounded px-1 py-0.5 text-xs font-mono text-tertiary-38">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // Helper function to render a block of markdown text (headers, lists, paragraphs)
  const renderMarkdownBlock = (textBlock: string): React.ReactNode[] => {
    return textBlock.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h3 key={i} className="text-xs font-bold mt-3 mb-1 uppercase tracking-tight opacity-70">{parseInline(trimmed.replace(/^###\s+/, ''))}</h3>;
      }
      if (trimmed.startsWith('##')) {
        return <h2 key={i} className="text-[15px] font-bold mt-4 mb-2 first:mt-0">{parseInline(trimmed.replace(/^##\s+/, ''))}</h2>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1 ml-1">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-primary/40 flex-shrink-0" />
            <span className="leading-relaxed text-[14px]">{parseInline(trimmed.replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
      }
      if (!trimmed) return <div key={i} className="h-1" />;
      return <p key={i} className="mb-2 last:mb-0 leading-relaxed text-[14px]">{parseInline(line)}</p>;
    });
  };

  // Main formatting function to handle interleaved code blocks and markdown
  const formatText = (fullText: string) => {
    if (!fullText || !fullText.trim()) return null;

    const contentBlocks: React.ReactNode[] = [];
    const codeBlockRegex = /(```(\w+)?\n[\s\S]*?\n```)/g; // Captures fenced code blocks and optional language

    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(fullText)) !== null) {
      const [fullMatch, codeContent, lang] = match;
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      // Add preceding text as markdown
      if (startIndex > lastIndex) {
        const textBlock = fullText.substring(lastIndex, startIndex);
        contentBlocks.push(...renderMarkdownBlock(textBlock));
      }

      // Add code block
      const actualCode = codeContent.replace(/^```(\w+)?\n/, '').replace(/\n```$/, '');
      contentBlocks.push(
        <pre key={`code-${startIndex}`} className="bg-ui-dark-0 dark:bg-black/70 rounded-lg p-3 sm:p-4 my-2 text-white overflow-x-auto text-xs font-mono shadow-inner border border-ui-dark-4">
          {lang && <div className="text-[10px] text-gray-400 uppercase mb-1">{lang}</div>}
          <code>{actualCode}</code>
        </pre>
      );
      lastIndex = endIndex;
    }

    // Add any remaining text as markdown
    if (lastIndex < fullText.length) {
      const textBlock = fullText.substring(lastIndex);
      contentBlocks.push(...renderMarkdownBlock(textBlock));
    }

    return contentBlocks;
  };

  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex w-full max-w-[95%] md:max-w-[85%] gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-brand-primary text-white shadow-sm mt-1">
            <Bot className="w-4 h-4" />
          </div>
        )}

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 max-w-full`}>
          {message.image && (
            <div className="mb-2 max-w-[200px] sm:max-w-xs rounded-xl overflow-hidden border border-ui-border dark:border-ui-dark-3 shadow-sm">
              <img src={message.image} alt="Upload" className="w-full h-auto object-cover max-h-60" />
            </div>
          )}

          <div className={`px-4 py-3 rounded-2xl relative ${
            isUser 
              ? 'bg-brand-primary text-white' 
              : 'bg-white dark:bg-ui-dark-1 border border-ui-border dark:border-ui-dark-3 text-secondary-60'
          }`}>
            {formatText(message.text)}
            
            {!isUser && !message.isStreaming && (
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-ui-border dark:border-ui-dark-3">
                <button onClick={copyToClipboard} className="text-tertiary-38 hover:text-brand-primary transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleTTS} disabled={isAudioLoading} className={`flex items-center gap-1.5 transition-colors ${isPlaying ? 'text-brand-primary' : 'text-tertiary-38 hover:text-brand-primary'}`}>
                  {isAudioLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest">{isPlaying ? "Stop" : "Listen"}</span>
                </button>
              </div>
            )}
          </div>

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 w-full max-w-sm">
              <div className="text-[9px] font-bold text-tertiary-38 uppercase tracking-widest mb-1.5 px-1">Verification Sources</div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, idx) => (
                  <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-ui-dark-1 border border-ui-border dark:border-ui-dark-3 rounded-md hover:border-brand-primary transition-all max-w-[150px]">
                    <ExternalLink className="w-2.5 h-2.5 text-brand-primary flex-shrink-0" />
                    <span className="text-[10px] truncate font-medium">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1.5 flex items-center gap-2 px-1 text-[9px] text-tertiary-38 font-bold tracking-tight uppercase">
             <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             {!isUser && (
               <div className="flex gap-2">
                 <button onClick={() => onRateMessage(message.id, 'up')} className={message.rating === 'up' ? 'text-brand-success' : 'hover:text-brand-success'}><ThumbsUp className="w-3 h-3" /></button>
                 <button onClick={() => onRateMessage(message.id, 'down')} className={message.rating === 'down' ? 'text-brand-error' : 'hover:text-brand-error'}><ThumbsDown className="w-3 h-3" /></button>
               </div>
             )}
             <button onClick={() => onRemoveMessage(message.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-error"><X className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};