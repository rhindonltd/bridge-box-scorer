"use client";

import { Assignment, Pair, Seat, parseSeat } from "@/model/participants";
import { Player } from "@/db/games/tables/players";

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

/**
 * This seated pair's own identity, independent of any round: the two players
 * that sat down together, and which side (NS/EW) this seat plays. Sourced from
 * the participant record for the initial seat, so it is available in every play
 * state (before start, mid-round, sit-out, game complete).
 */
export interface SeatedPair {
  players: [Player, Player];
  side: "NS" | "EW";
}

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
  /**
   * This seat's own pair (its two players and side), or null while the pair
   * list is loading or if this seat has no participant record yet.
   */
  pair: SeatedPair | null;
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

  // This pair's section, derived from its (section-qualified) initial seat.
  const mySection = useMemo(() => {
    try {
      return parseSeat(initialSeat).section;
    } catch {
      return null;
    }
  }, [initialSeat]);

  /*
   * When no movement has been selected the schedule route responds 404, so
   * `data` stays undefined and `assignment` resolves to null. That is the
   * expected "no assignment yet" state, so a 404 is not retried.
   */
  const { data, isLoading } = useSWR<ScheduleResponse>(key, fetcher, {
    shouldRetryOnError: (error: Error & { status?: number }) =>
      error.status !== 404,
  });

  // This seat's own pair (its two players), independent of the movement/round.
  // The participants list is game-wide; we pick out this seat's row. It is
  // available before the game starts and in every play state.
  const pairsKey = swrKeys.pairs(gameId);
  const { data: pairsData } = useSWR<{ pairs: Pair[] }>(pairsKey, fetcher);

  /*
   * The director can change the movement mid-session, which re-derives every
   * pair's assignment id. Revalidate the schedule whenever the game updates
   * (and on reconnect) so the assignment id stays in sync.
   */
  useEffect(() => {
    const revalidate = () => {
      void globalMutate(key);
    };

    // A section-scoped update only concerns this pair when it names this
    // pair's section (the server also scopes the emit to the section room, so
    // this is a belt-and-braces guard).
    const revalidateForSection = (payload?: { section?: string }) => {
      if (!payload?.section || payload.section === mySection) {
        void globalMutate(key);
      }
    };

    socket.on(SocketEvents.GAME_UPDATED, revalidate);
    socket.on(SocketEvents.SECTION_UPDATED, revalidateForSection);
    socket.on(SocketEvents.CONNECT, revalidate);

    return () => {
      socket.off(SocketEvents.GAME_UPDATED, revalidate);
      socket.off(SocketEvents.SECTION_UPDATED, revalidateForSection);
      socket.off(SocketEvents.CONNECT, revalidate);
    };
  }, [socket, key, mySection]);

  /*
   * The participant list changes when players seat/leave/are evicted (broadcast
   * as PARTICIPANTS). Revalidate the pair list then (and on reconnect) so this
   * seat's own pair stays current.
   */
  useEffect(() => {
    const revalidatePairs = () => {
      void globalMutate(pairsKey);
    };

    socket.on(SocketEvents.PARTICIPANTS, revalidatePairs);
    socket.on(SocketEvents.CONNECT, revalidatePairs);

    return () => {
      socket.off(SocketEvents.PARTICIPANTS, revalidatePairs);
      socket.off(SocketEvents.CONNECT, revalidatePairs);
    };
  }, [socket, pairsKey]);

  const assignment = useMemo<Assignment | null>(() => {
    if (!data?.assignmentId) {
      return null;
    }

    return { type: "PAIR", id: data.assignmentId };
  }, [data]);

  const pair = useMemo<SeatedPair | null>(() => {
    const mine = pairsData?.pairs.find((p) => p.initialSeat === initialSeat);
    if (!mine) {
      return null;
    }

    let side: "NS" | "EW";
    try {
      side = parseSeat(initialSeat).direction;
    } catch {
      return null;
    }

    return { players: [mine.player1, mine.player2], side };
  }, [pairsData, initialSeat]);

  return (
    <AssignmentContext.Provider
      value={{
        assignment,
        pair,
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
