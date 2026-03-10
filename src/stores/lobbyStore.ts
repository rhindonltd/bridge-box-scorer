import { create } from "zustand"
import { persist } from "zustand/middleware"

type LobbyState = {
    eventId: string | null
    sessionId: string | null
    sectionId: string | null
    tableId: number | null
    direction: 'NS' | 'EW' | null

    selectEvent: (id: string) => void
    selectSession: (id: string) => void
    selectSection: (id: string) => void
    selectTable: (id: number) => void
    selectDirection: (direction: 'NS' | 'EW') => void
}

export const useLobbyStore = create<LobbyState>()(
    persist(
        (set) => ({
            eventId: null,
            sessionId: null,
            sectionId: null,
            tableId: null,
            direction: null,

            selectEvent: (id) =>
                set({
                    eventId: id,
                    sessionId: null,
                    sectionId: null,
                    tableId: null,
                    direction: null
                }),

            selectSession: (id) =>
                set({
                    sessionId: id,
                    sectionId: null,
                    tableId: null,
                    direction: null
                }),

            selectSection: (id) =>
                set({
                    sectionId: id,
                    tableId: null,
                    direction: null
                }),

            selectTable: (id) => set({ tableId: id }),

            selectDirection: (direction: 'NS' | 'EW') => set({ direction }),
        }),
        {
            name: "lobby-storage"
        }
    )
)