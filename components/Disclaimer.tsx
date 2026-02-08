import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export const Disclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-brand-primary-5 border-b border-ui-border p-3 sm:p-4 relative animate-fade-in-down dark:bg-ui-dark-1 dark:border-ui-dark-3">
      <div className="max-w-4xl mx-auto flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0 opacity-80" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-[13px] leading-relaxed text-secondary-60">
            <span className="font-bold text-brand-primary">Information only:</span> This assistant provides general health info, not diagnosis or treatment. 
            For medical emergencies, contact services immediately.
          </p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss disclaimer"
          className="text-tertiary-38 hover:text-primary-87 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};