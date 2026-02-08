
// Define the AIStudio type to avoid conflicts and ensure type consistency.
export interface AIStudio { // Changed from type to interface to allow for declaration merging
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    // Explicitly reference the AIStudio type from this module to ensure type consistency.
    aistudio?: import('./types').AIStudio;
  }
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  image?: string; // Base64 image data
  isStreaming?: boolean;
  sources?: GroundingSource[];
  timestamp: Date;
  rating?: 'up' | 'down';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface HealthFact {
  id: string;
  text: string;
  category: 'Allergy' | 'Condition' | 'Goal' | 'General';
  createdAt: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeChatId: string | null;
  isLoading: boolean;
  error: string | null;
}