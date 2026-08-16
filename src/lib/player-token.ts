/**
 * Client-side player token store.
 *
 * Tokens are stored in localStorage keyed by gameId so a token is unique to a particular player and gameId combination.
 *
 * Storage key format: `player:<gameId>`
 */

const PREFIX = "player:";

export type PlayerToken = {
  startingPosition: string;
  token: string;
};

export function setPlayerToken(gameId: string, playerToken: PlayerToken): void {
  localStorage.setItem(`${PREFIX}${gameId}`, JSON.stringify(playerToken));
}

export function getPlayerToken(gameId: string): PlayerToken | null {
  const value = localStorage.getItem(`${PREFIX}${gameId}`);
  if (value == null) {
    return null;
  } else {
    return JSON.parse(value);
  }
}

export function clearPlayerToken(gameId: string): void {
  localStorage.removeItem(`${PREFIX}${gameId}`);
}
