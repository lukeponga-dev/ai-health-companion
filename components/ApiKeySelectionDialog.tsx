import React from 'react';
import { X, Key, ExternalLink } from 'lucide-react';

interface ApiKeySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKey: () => Promise<void>;
}

export const ApiKeySelectionDialog: React.FC<ApiKeySelectionDialogProps> = ({ isOpen, onClose, onSelectKey }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ui-panel dark:bg-ui-dark-1 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-fade-in-up border border-ui-border dark:border-ui-dark-3">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-ui-dark-2 rounded-full text-tertiary-38"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-primary-87 mb-2">Unlock Higher Limits</h2>
        <p className="text-secondary-60 text-sm mb-6">
          Provide your own Google Gemini API key for increased usage limits and enhanced features.
          Your key remains secure and is never stored by the app.
        </p>

        <button 
          onClick={onSelectKey}
          className="px-6 py-3 bg-brand-primary hover:opacity-90 text-white font-semibold rounded-xl transition-colors w-full shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
        >
          <Key className="w-5 h-5" />
          Select API Key
        </button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-4 text-brand-primary hover:underline text-sm flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          Understand Billing
        </a>
      </div>
      <style>{`
        @keyframes fadeInOutUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInOutUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};