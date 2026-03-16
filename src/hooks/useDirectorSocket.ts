import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useDirectorStore } from "@/stores/directorStore";
import {
  DirectorServerToClientEvents,
  DirectorClientToServerEvents,
} from "@/types/directorSocket";
import { mutate } from "swr";
import { BridgeEvent } from "@/db/schema";

export function useDirectorSocket() {
  const addEvent = useDirectorStore((state) => state.addBridgeEvent);
  const updateEvent = useDirectorStore((state) => state.updateBridgeEvent);

  const socketRef = useRef<Socket<
    DirectorServerToClientEvents,
    DirectorClientToServerEvents
  > | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("directorToken");
    if (!token) return;

    const socket = io("http://localhost:3000", { auth: { token } });
    socketRef.current = socket;

    socket.on("event:created", (serverEvent: BridgeEvent) => {
      mutate(
        "/api/events",
        (events: BridgeEvent[] = []) => {
          const index = events.findIndex((e) => e.id === serverEvent.id);
          if (index !== -1) {
            const newEvents = [...events];
            newEvents[index] = serverEvent;
            return newEvents;
          }
          return [...events, serverEvent];
        },
        false,
      );

      addEvent(serverEvent); // Update Zustand store
    });

    return () => {
      socket.disconnect();
    };
  }, [addEvent]);

  return socketRef;
}
