import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-50 border-b border-red-100 p-4 relative animate-fade-in-down
                    dark:bg-red-900 dark:border-red-800">
      <div className="max-w-4xl mx-auto flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0
                                dark:text-red-300" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800
                         dark:text-red-100">Application Error</h4>
          <p className="text-sm text-red-700 mt-1
                        dark:text-red-200">
            {message}
          </p>
        </div>
        <button 
          onClick={onDismiss}
          aria-label="Dismiss error message"
          className="text-red-500 hover:text-red-700 transition-colors
                     dark:text-red-400 dark:hover:text-red-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
