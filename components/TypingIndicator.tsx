import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex w-full mb-3 justify-start animate-fade-in">
      <div className="flex max-w-[85%] md:max-w-[75%] gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0 w-8 h-8">
          <div className="absolute inset-0 bg-teal-400/30 rounded-xl animate-ping"></div>
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center bg-teal-600 text-white shadow-lg ring-2 ring-white/50 dark:ring-slate-800/50 z-10">
            <Bot className="w-4 h-4" />
          </div>
        </div>

        {/* Bubble */}
        <div className="flex flex-col items-start justify-center">
          <div className="bg-white border border-slate-100 px-4 py-3 rounded-[1.25rem] rounded-tl-none shadow-sm flex items-center gap-2 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse-wave [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse-wave [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse-wave"></div>
            </div>
            <div className="h-3 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1"></div>
            <div className="flex items-center gap-1 text-slate-400">
               <Sparkles className="w-3 h-3 animate-pulse" />
               <span className="text-[10px] font-bold tracking-tight">Synthesizing...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};