import { create } from 'zustand';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUri?: string;
}

interface JessicaChatState {
  isVisible: boolean;
  messages: ChatMessage[];
  currentUserId: string | null;
  setCurrentUser: (userId: string) => void;
  showChat: () => void;
  hideChat: () => void;
  toggleChat: () => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export const useJessicaChatStore = create<JessicaChatState>((set, get) => ({
  isVisible: false,
  messages: [
    {
      id: '1',
      text: "Hi! I'm Jessica, your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }
  ],
  currentUserId: null,
  
  setCurrentUser: (userId: string) => {
    set({ currentUserId: userId });
  },
  
  showChat: () => {
    set({ isVisible: true });
  },
  
  hideChat: () => {
    set({ isVisible: false });
  },
  
  toggleChat: () => {
    set((state) => ({ isVisible: !state.isVisible }));
  },
  
  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  
  clearMessages: () => {
    set({
      messages: [
        {
          id: '1',
          text: "Hi! I'm Jessica, your AI assistant. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        }
      ]
    });
  },
})); 