import { create } from "zustand"
import {DirectorEvent, OptimisticDirectorEvent} from "@/types/directorSocket"

interface DirectorState {
    events: OptimisticDirectorEvent[]
    addEvent: (event: OptimisticDirectorEvent) => void
    updateEvent: (clientId: string, updates: Partial<OptimisticDirectorEvent>) => void
    setEvents: (events: DirectorEvent[]) => void
}

export const useDirectorStore = create<DirectorState>((set) => ({
    events: [],
    addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
    updateEvent: (clientId, updates) =>
        set((state) => ({
            events: state.events.map((e) =>
                e.clientId === clientId ? { ...e, ...updates } : e
            ),
        })),
    setEvents: (events) => set({ events }),
}))
