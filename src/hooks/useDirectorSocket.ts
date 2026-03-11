import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useDirectorStore } from "@/stores/directorStore";
import {
  DirectorEvent,
  DirectorServerToClientEvents,
  DirectorClientToServerEvents,
} from "@/types/directorSocket";
import { mutate } from "swr";

export function useDirectorSocket() {
  const addEvent = useDirectorStore((state) => state.addEvent);
  const updateEvent = useDirectorStore((state) => state.updateEvent);

  const socketRef = useRef<Socket<
    DirectorServerToClientEvents,
    DirectorClientToServerEvents
  > | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("directorToken");
    if (!token) return;

    const socket = io("http://localhost:3000", { auth: { token } });
    socketRef.current = socket;

    socket.on(
      "event:created",
      (serverEvent: DirectorEvent & { clientId?: string }) => {
        mutate(
          "/api/events",
          (events: (DirectorEvent & { clientId?: string })[] = []) => {
            const index = events.findIndex(
              (e) => e.clientId === serverEvent.clientId,
            );
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
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [addEvent]);

  return socketRef;
}
