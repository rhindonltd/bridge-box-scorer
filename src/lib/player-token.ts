/**
 * Client-side player token store.
 *
 * Tokens are stored in localStorage keyed by gameId so a token is unique to a
 * particular player and gameId combination.
 *
 * Storage key format: `player:<gameId>`
 */

import { createKeyedTokenStore } from "@/lib/token-store";

export type PlayerToken = {
  startingPosition: string;
  token: string;
};

const store = createKeyedTokenStore<PlayerToken>(
  "player:",
  (value) => JSON.stringify(value),
  (raw) => JSON.parse(raw) as PlayerToken,
);

export function setPlayerToken(gameId: string, playerToken: PlayerToken): void {
  store.set(gameId, playerToken);
}

export function getPlayerToken(gameId: string): PlayerToken | null {
  return store.get(gameId);
}

export function clearPlayerToken(gameId: string): void {
  store.clear(gameId);
}
