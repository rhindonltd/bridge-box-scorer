"use client";

import { Assignment, Seat } from "@/model/participants";

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
} from "react";

import useSWR, { mutate as globalMutate } from "swr";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { fetcher } from "@/lib/fetcher";

/*
 * The schedule endpoint is keyed by `initialSeat` and, when a movement
 * exists, resolves the pair's movement-facing identity (its assignment id).
 * `initialSeat` is the stable identity of the pair (independent of the
 * movement); the assignment id only exists once a movement has been
 * selected, and is what movement-related features and traveller/leaderboard
 * highlighting key off.
 */
interface ScheduleResponse {
  assignmentId: string;
  side: "NS" | "EW";
  rounds: unknown[];
}

interface ContextType {
  assignment: Assignment | null;
  isLoading: boolean;
}

export const AssignmentContext = createContext<ContextType | undefined>(
  undefined,
);

export function AssignmentProvider({
  gameId,
  initialSeat,
  children,
}: {
  gameId: string;
  initialSeat: Seat;
  children: ReactNode;
}) {
  const socket = getSocket();

  const key = swrKeys.schedule(gameId, initialSeat);

  /*
   * When no movement has been selected the schedule route responds 404, so
   * `data` stays undefined and `assignment` resolves to null. That is the
   * expected "no assignment yet" state, so a 404 is not retried.
   */
  const { data, isLoading } = useSWR<ScheduleResponse>(key, fetcher, {
    shouldRetryOnError: (error: Error & { status?: number }) =>
      error.status !== 404,
  });

  /*
   * The director can change the movement mid-session, which re-derives every
   * pair's assignment id. Revalidate the schedule whenever the game updates
   * (and on reconnect) so the assignment id stays in sync.
   */
  useEffect(() => {
    const revalidate = () => {
      void globalMutate(key);
    };

    socket.on(SocketEvents.GAME_UPDATED, revalidate);
    socket.on(SocketEvents.CONNECT, revalidate);

    return () => {
      socket.off(SocketEvents.GAME_UPDATED, revalidate);
      socket.off(SocketEvents.CONNECT, revalidate);
    };
  }, [socket, key]);

  const assignment = useMemo<Assignment | null>(() => {
    if (!data?.assignmentId) {
      return null;
    }

    return { type: "PAIR", id: data.assignmentId };
  }, [data]);

  return (
    <AssignmentContext.Provider
      value={{
        assignment,
        isLoading,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignment() {
  const ctx = useContext(AssignmentContext);

  if (!ctx) {
    throw new Error("useAssignment must be used within AssignmentProvider");
  }

  return ctx;
}
