import React, { useState, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Brain, Edit2, Check, RotateCcw, Search, Filter, Download, Upload, Shield } from 'lucide-react';
import { HealthFact } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memories: HealthFact[];
  onAddMemory: (fact: HealthFact) => void;
  onRemoveMemory: (id: string) => void;
  onUpdateMemory: (fact: HealthFact) => void;
  onClearHistory: () => void;
  onExport: () => void;
  onRestore: (file: File) => Promise<void>;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ 
  isOpen, onClose, memories, onAddMemory, onRemoveMemory, onUpdateMemory, onClearHistory, onExport, onRestore
}) => {
  const [newFact, setNewFact] = useState('');
  const [category, setCategory] = useState<HealthFact['category']>('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<HealthFact['category'] | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMemories = useMemo(() => {
    return memories
      .filter(m => (activeFilter === 'All' || m.category === activeFilter) && m.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [memories, searchQuery, activeFilter]);

  if (!isOpen) return null;

  const catColors: any = {
    General: 'bg-brand-primary text-white',
    Allergy: 'bg-brand-error text-white',
    Condition: 'bg-brand-warning text-black',
    Goal: 'bg-brand-success text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ui-panel dark:bg-ui-dark-1 h-full shadow-2xl flex flex-col border-l border-ui-border dark:border-ui-dark-3 animate-fade-in-right">
        
        <div className="p-6 border-b border-ui-border dark:border-ui-dark-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-primary">
            <Brain className="w-5 h-5" />
            <h2 className="text-lg font-bold">Health Memories</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-ui-dark-2 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {['General', 'Allergy', 'Condition', 'Goal'].map(c => (
                <button key={c} onClick={() => setCategory(c as any)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${category === c ? catColors[c] : 'bg-ui-bg dark:bg-ui-dark-2 text-tertiary-38 border border-ui-border dark:border-ui-dark-3'}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="relative">
              <textarea
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="Type a new health record..."
                className="w-full bg-white dark:bg-ui-dark-2 border border-ui-border dark:border-ui-dark-3 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
              />
              <button onClick={() => { if(newFact.trim()) onAddMemory({ id: uuidv4(), text: newFact.trim(), category, createdAt: Date.now() }); setNewFact(''); }} className="absolute bottom-4 right-4 p-2 bg-brand-primary text-white rounded-lg shadow-lg">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary-38" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-ui-bg dark:bg-ui-dark-2 border border-ui-border dark:border-ui-dark-3 rounded-xl text-sm" placeholder="Filter records..." />
            </div>
            
            <div className="space-y-3">
              {filteredMemories.map(m => (
                <div key={m.id} className="p-4 bg-white dark:bg-ui-dark-2 border border-ui-border dark:border-ui-dark-3 rounded-2xl relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${catColors[m.category]}`}>{m.category}</span>
                    <span className="text-[9px] text-tertiary-38">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onRemoveMemory(m.id)} className="text-tertiary-38 hover:text-brand-error"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-ui-border dark:border-ui-dark-3 grid grid-cols-2 gap-3">
           <button onClick={onExport} className="flex items-center justify-center gap-2 py-3 bg-ui-bg dark:bg-ui-dark-2 rounded-xl text-xs font-bold"><Download className="w-4 h-4" /> Export</button>
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 bg-brand-primary text-white rounded-xl text-xs font-bold"><Upload className="w-4 h-4" /> Restore</button>
           <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={async (e) => { const f = e.target.files?.[0]; if(f) await onRestore(f); }} />
           <button onClick={onClearHistory} className="col-span-2 py-3 bg-ui-bg dark:bg-ui-dark-3 rounded-xl text-xs font-bold text-brand-error flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reset All Data</button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fade-in-right { animation: fadeInRight 0.3s ease-out; }
      `}</style>
    </div>
  );
};