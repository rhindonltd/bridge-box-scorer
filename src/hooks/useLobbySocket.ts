import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { mutate } from "swr";
import {
  LobbyEvent,
  LobbyClientToServerEvents,
  LobbyServerToClientEvents,
} from "@/types/lobbySocket";

export function useLobbySocket() {
  const socketRef = useRef<Socket<
    LobbyServerToClientEvents,
    LobbyClientToServerEvents
  > | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    // Typed event listener
    socket.on("event:created", (newEvent: LobbyEvent) => {
      // Patch SWR cache directly
      mutate(
        "/api/events",
        (events: LobbyEvent[] = []) => [...events, newEvent],
        false,
      );
    });

    socket.on("player:joined", (playerId, tableId) => {
      console.log(`Player ${playerId} joined table ${tableId}`);
    });

    socket.on("player:left", (playerId, tableId) => {
      console.log(`Player ${playerId} left table ${tableId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
