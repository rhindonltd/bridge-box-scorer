"use client";

import { useState } from "react";
import { getPlayerToken } from "@/lib/player-token";

/**
 * The seat this device holds for a game (its section-qualified starting
 * position, e.g. "A3NS"), or null when the device is not seated in this game.
 *
 * Read from the stored `player:<gameId>` token. A device can hold both a player
 * token and a director token for the same game, so a seated director gets a
 * seat here while an unseated director gets null (and is offered the join flow
 * instead). Read once on mount and held in state (the seat does not change
 * within a mounted screen), with the localStorage read confined to the
 * client-only initializer.
 */
export function usePlayerSeat(gameId: string): string | null {
  const [seat] = useState(
    () => getPlayerToken(gameId)?.startingPosition ?? null,
  );
  return seat;
}
