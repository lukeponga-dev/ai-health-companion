import React, { useState, useRef } from 'react';
import { Sparkles, X, ArrowUp, Image as ImageIcon, Loader2 } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '../constants';

interface InputAreaProps {
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
  showSuggestions: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, showSuggestions }) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachedImage) && !isLoading) {
      onSendMessage(input.trim() || (attachedImage ? "Analyze this image." : ""), attachedImage || undefined);
      setInput('');
      setAttachedImage(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = !input.trim() && !attachedImage;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 z-30 transition-all duration-300">
      <div className="flex flex-col gap-3">
        
        {/* Minimalist Suggestions */}
        {showSuggestions && !input.trim() && !attachedImage && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(prompt)}
                className="flex-shrink-0 text-[12px] font-medium text-secondary-60 bg-ui-bg dark:bg-ui-dark-2 border border-ui-border dark:border-ui-dark-3 rounded-full px-4 py-1.5 hover:bg-brand-primary-5 hover:text-brand-primary transition-all whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Minimalist Input Box */}
        <div className="relative flex flex-col bg-white dark:bg-ui-dark-1 border border-ui-border dark:border-ui-dark-3 rounded-2xl transition-shadow focus-within:shadow-md focus-within:border-brand-primary/30">
          
          {/* Subtle Image Preview Overlay */}
          {attachedImage && (
            <div className="px-4 pt-4 flex gap-2">
              <div className="relative group">
                <img src={attachedImage} className="w-16 h-16 rounded-lg object-cover border border-ui-border dark:border-ui-dark-3 shadow-sm" alt="preview" />
                <button 
                  onClick={() => setAttachedImage(null)} 
                  className="absolute -top-1.5 -right-1.5 bg-ui-dark-1/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-end gap-2 p-2">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2 text-tertiary-38 hover:text-brand-primary transition-colors rounded-xl hover:bg-ui-bg dark:hover:bg-ui-dark-2 mb-1"
              title="Add image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-1 text-[15px] leading-snug max-h-[160px] text-primary-87 placeholder:text-tertiary-38"
              rows={1}
            />
            
            <button
              onClick={() => handleSubmit()}
              disabled={isEmpty || isLoading}
              className={`p-2.5 rounded-xl transition-all mb-0.5 ${
                isEmpty || isLoading 
                  ? 'text-tertiary-38 opacity-50' 
                  : 'text-brand-primary bg-brand-primary-5 hover:bg-brand-primary hover:text-white'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Subtle Branding */}
        <p className="text-[10px] text-center text-tertiary-38 font-medium">
          Always consult a professional for medical emergencies.
        </p>
      </div>
    </div>
  );
};