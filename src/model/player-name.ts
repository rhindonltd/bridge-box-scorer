/** The parts of a player a name is shown from. */
export interface PlayerNameParts {
  firstName: string;
  lastName: string;
}

/** "First Last", trimmed. */
export function playerName(player: PlayerNameParts): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

/**
 * A pair's names, "First Last & First Last". A missing player is left out, so
 * a pair with one known player shows just that player.
 */
export function pairName(
  player1: PlayerNameParts | undefined,
  player2: PlayerNameParts | undefined,
): string {
  return [player1, player2]
    .filter((p): p is PlayerNameParts => p != null)
    .map(playerName)
    .join(" & ");
}
