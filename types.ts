
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
