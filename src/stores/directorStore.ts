import { create } from "zustand";
import { BridgeEvent, BridgeSession, BridgeSection } from "@/db/schema";

interface DirectorState {
  bridgeEvents: BridgeEvent[];
  sessions: Record<string, BridgeSession[]>;
  sections: Record<string, BridgeSection[]>;

  addBridgeEvent: (event: BridgeEvent) => void;
  updateBridgeEvent: (id: string, updates: Partial<BridgeEvent>) => void;
  setBridgeEvents: (events: BridgeEvent[]) => void;

  setSessionsForEvent: (eventId: string, sessions: BridgeSession[]) => void;
  setSectionsForSession: (sessionId: string, sections: BridgeSection[]) => void;
}

export const useDirectorStore = create<DirectorState>((set) => ({
  bridgeEvents: [],
  sessions: {},
  sections: {},

  addBridgeEvent: (event) =>
    set((state) => ({ bridgeEvents: [...state.bridgeEvents, event] })),
  updateBridgeEvent: (id, updates) =>
    set((state) => ({
      bridgeEvents: state.bridgeEvents.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })),
  setBridgeEvents: (events) => set({ bridgeEvents: events }),

  setSessionsForEvent: (eventId, sessions) =>
    set((state) => ({ sessions: { ...state.sessions, [eventId]: sessions } })),

  setSectionsForSession: (sessionId, sections) =>
    set((state) => ({
      sections: { ...state.sections, [sessionId]: sections },
    })),
}));
