import { create } from "zustand";
import { SearchResult } from "../services/api";
import { AICommand } from "../hooks/useAIVoiceHook";

interface AIVoiceState {
  isRegistered: boolean;
  isListening: boolean;
  currentCommand: AICommand | null;
  searchResults: SearchResult[];
  error: string | null;
  setIsRegistered: (isRegistered: boolean) => void;
  setIsListening: (isListening: boolean) => void;
  setCurrentCommand: (command: AICommand | null) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setError: (error: string | null) => void;
  clearSearchResults: () => void;
  clearError: () => void;
}

export const useAIVoiceStore = create<AIVoiceState>((set) => ({
  isRegistered: false,
  isListening: false,
  currentCommand: null,
  searchResults: [],
  error: null,
  setIsRegistered: (isRegistered) => set({ isRegistered }),
  setIsListening: (isListening) => set({ isListening }),
  setCurrentCommand: (command) => set({ currentCommand: command }),
  setSearchResults: (results) => set({ searchResults: results }),
  setError: (error) => set({ error }),
  clearSearchResults: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),
}));
