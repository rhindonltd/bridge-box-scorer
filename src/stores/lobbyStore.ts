import { create } from "zustand";
import { persist } from "zustand/middleware";

type LobbyState = {
  eventId: string | null;
  sessionId: string | null;
  sectionId: string | null;
  tableId: number | null;
  direction: "NS" | "EW" | null;
  player1: string | null;
  player2: string | null;

  selectEvent: (id: string) => void;
  selectSession: (id: string) => void;
  selectSection: (id: string) => void;
  selectTableAndDirection: (id: number, direction: "NS" | "EW") => void;
  selectPlayers: (player1: string, player2: string) => void;
};

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      eventId: null,
      sessionId: null,
      sectionId: null,
      tableId: null,
      direction: null,
      player1: null,
      player2: null,

      selectEvent: (id) =>
        set({
          eventId: id,
          sessionId: null,
          sectionId: null,
          tableId: null,
          direction: null,
          player1: null,
          player2: null,
        }),

      selectSession: (id) =>
        set({
          sessionId: id,
          sectionId: null,
          tableId: null,
          direction: null,
          player1: null,
          player2: null,
        }),

      selectSection: (id) =>
        set({
          sectionId: id,
          tableId: null,
          direction: null,
          player1: null,
          player2: null,
        }),

      selectTableAndDirection: (tableId, direction) =>
        set({ tableId, direction }),

      selectPlayers: (player1, player2) => set({ player1, player2 }),
    }),
    {
      name: "lobby-storage",
    },
  ),
);
