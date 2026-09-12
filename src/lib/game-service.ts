import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck, emitEvent } from "@/lib/socket";
import { NewParticipant } from "@/model/participants";
import { setDirectorToken, getDirectorToken } from "@/lib/director-token";
import {
  setPlayerToken,
  getPlayerToken,
  clearPlayerToken,
} from "./player-token";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

/**
 * Create a game over HTTP. The creator becomes the game's director; the
 * returned token is stored locally so subsequent director-only calls
 * authenticate. Throws with the server's error message on failure.
 */
export async function createGame(game: NewBridgeGame): Promise<BridgeGame> {
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to create game");
  }

  const { game: created, directorToken } = data.result as {
    game: BridgeGame;
    directorToken: string;
  };

  // Store the director token in localStorage keyed by gameId.
  setDirectorToken(created.gameId, directorToken);

  return created;
}

export async function selectMovement(gameId: string, id: number, type: string) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, {
    gameId,
    type,
    id,
    directorToken: getDirectorToken(gameId),
  });
}

export async function selectMitchellMovement(
  gameId: string,
  mitchell: MitchellMovementSpec,
) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, {
    gameId,
    type: "PAIRS",
    mitchell,
    directorToken: getDirectorToken(gameId),
  });
}

export async function startGame(gameId: string): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/start`, {
    method: "POST",
    headers: { "x-director-token": getDirectorToken(gameId) ?? "" },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to start game");
  }
}

/**
 * Claim a director share code. No auth (the caller has no token yet) — the code
 * is the credential. On success the minted director token is stored locally
 * keyed by the resolved gameId, which is returned. Throws with the server's
 * error message (e.g. invalid/expired/used code) on failure.
 */
export async function claimDirectorCode(code: string): Promise<string> {
  const res = await fetch("/api/director-codes/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to claim code");
  }

  const { directorToken, gameId } = data.result as {
    directorToken: string;
    gameId: string;
  };

  setDirectorToken(gameId, directorToken);

  return gameId;
}

/**
 * Mint a short, single-use director share code for a game (director-only).
 * Returns the code; throws with the server's error message on failure.
 */
export async function generateShareCode(gameId: string): Promise<string> {
  const res = await fetch(`/api/games/${gameId}/share-code`, {
    method: "POST",
    headers: { "x-director-token": getDirectorToken(gameId) ?? "" },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to generate code");
  }

  return (data.result as { code: string }).code;
}

export async function createParticipant(
  gameId: string,
  newParticipant: NewParticipant,
) {
  const response = await emitWithAck<{ success: boolean; key: string }>(
    SocketEvents.CREATE_PARTICIPANT,
    { gameId, newParticipant },
  );

  setPlayerToken(gameId, {
    startingPosition: newParticipant.initialSeat,
    token: response.key,
  });
}

/**
 * Leave (vacate) the seat this device holds, before the game starts. Authed by
 * the seat's own token. On success the local player token is cleared so this
 * device no longer claims the seat. Throws the server's message on failure
 * (e.g. the game has already started).
 */
export async function leaveTable(gameId: string, seat: string): Promise<void> {
  await emitWithAck<{ success: boolean }>(SocketEvents.LEAVE_TABLE, {
    gameId,
    seat,
    token: getPlayerToken(gameId)?.token ?? "",
  });

  clearPlayerToken(gameId);
}

/**
 * Mint a short, single-use code that another device can claim to take over this
 * seat (a "change device" handoff). Authed by the seat's own token. Returns the
 * code; throws the server's message on failure.
 */
export async function generateSeatTransferCode(
  gameId: string,
  seat: string,
): Promise<string> {
  const response = await emitWithAck<{ code: string }>(
    SocketEvents.CREATE_SEAT_TRANSFER,
    { gameId, seat, token: getPlayerToken(gameId)?.token ?? "" },
  );

  return response.code;
}

/**
 * Claim a seat-transfer code on a new device. No auth — the code is the
 * credential. On success the seat's secret has been rotated to a fresh token
 * (invalidating the old device); that token is stored locally and the resolved
 * game + seat are returned so the caller can route into play. Throws the
 * server's message on failure (invalid/expired/used code, or the seat is no
 * longer occupied).
 */
export async function claimSeatTransfer(
  code: string,
): Promise<{ gameId: string; seat: string }> {
  const { gameId, seat, token } = await emitWithAck<{
    gameId: string;
    seat: string;
    token: string;
  }>(SocketEvents.CLAIM_SEAT_TRANSFER, { code });

  setPlayerToken(gameId, { startingPosition: seat, token });

  return { gameId, seat };
}
