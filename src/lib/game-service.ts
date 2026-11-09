import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { GameType } from "@/db/games/types/game-type";
import { EventFormat } from "@/db/games/types/event-format";
import { ScoringType } from "@/db/games/types/scoring-type";
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
 * Set whether a multi-section game also shows a combined overall ranking across
 * all sections (director-only). The fresh game row is broadcast to every
 * device, and any open leaderboard display gains/drops the combined view live.
 * Throws with the server's error message on failure.
 */
export async function updateCombinedRanking(
  gameId: string,
  combinedRanking: boolean,
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-director-token": getDirectorToken(gameId) ?? "",
    },
    body: JSON.stringify({ combinedRanking }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to update setting");
  }
}

/** One occupant's eligibility choice for {@link setSubstitutionOptions}. */
export interface OccupantEligibilityInput {
  /** The occupancy's surrogate id. */
  id: number;
  /** true ⇒ eligible (ranked); false ⇒ without standing (unranked). */
  eligible: boolean;
}

/**
 * Set a §2.4.7 handover seat's Substitutions options — the director's two
 * toggles: "Split by board?" (per seat) and "Eligible for local ranking?" (per
 * occupant). Director-only; writes `split` on both occupancies + each
 * occupant's standing, then re-broadcasts the standings. Throws with the
 * server's error message on failure.
 */
export async function setSubstitutionOptions(
  gameId: string,
  seat: string,
  options: {
    split: boolean;
    eligibility: OccupantEligibilityInput[];
    /** Main pair's occupancy id (merged-line identity; split=false only). */
    mainOccupancyId?: number;
  },
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/substitutions`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-director-token": getDirectorToken(gameId) ?? "",
    },
    body: JSON.stringify({
      seat,
      split: options.split,
      eligibility: options.eligibility,
      ...(options.mainOccupancyId != null
        ? { mainOccupancyId: options.mainOccupancyId }
        : {}),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to set substitution options");
  }
}

/**
 * Design §11: withdraw the pair holding `seat` from the event, from the round
 * it is on. Its unplayed boards will not be played; the director decides how
 * they score. Throws the server's message on failure.
 */
export async function withdrawPair(
  gameId: string,
  seat: string,
): Promise<void> {
  await emitWithAck<null>(SocketEvents.WITHDRAW_PAIR, {
    gameId,
    seat,
    token: getPlayerToken(gameId)?.token ?? "",
  });
  // The server rotated the seat's secret away, so this device's token is now
  // dead — clear it so no stale credential lingers. Reinstating mints a fresh
  // code the returning device claims.
  clearPlayerToken(gameId);
}

/**
 * Design §11 (director-only): how a late / withdrawn pair's missed boards
 * score — AVERAGE (AVE−/AVE+) or REMOVED. Throws the server's message.
 */
export async function setAbsenceTreatment(
  gameId: string,
  seat: string,
  treatment: "AVERAGE" | "REMOVED",
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/absences`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-director-token": getDirectorToken(gameId) ?? "",
    },
    body: JSON.stringify({ seat, treatment }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to save");
  }
}

/**
 * Design §11 (director-only): withdraw a pair from the round it is on. Throws
 * the server's message on failure. (Reinstating is not here — it goes through
 * a REINSTATE seat-transfer code the returning device claims.)
 */
export async function withdrawPairAsDirector(
  gameId: string,
  seat: string,
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/pairs`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-director-token": getDirectorToken(gameId) ?? "",
    },
    body: JSON.stringify({ seat, action: "withdraw" }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to withdraw the pair");
  }
}

/** The event-detail fields a director may edit after creation. */
export interface EventDetailsUpdate {
  eventName?: string;
  director?: string | null;
  gameType?: GameType;
  eventFormat?: EventFormat;
  scoringType?: ScoringType;
  leadCardRequired?: boolean;
  handEntryEnabled?: boolean;
}

/**
 * Edit a game's core event details after creation (director-only): the event
 * name/director plus the create-form options (event type, scoring, and the
 * per-game toggles). A structural change (game type / format / scoring) clears
 * the selected movement server-side so the director re-picks one that fits. The
 * fresh game row is broadcast to every device. Throws with the server's error
 * message on failure.
 */
export async function updateEventDetails(
  gameId: string,
  update: EventDetailsUpdate,
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-director-token": getDirectorToken(gameId) ?? "",
    },
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to update event details");
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
  teamName?: string,
) {
  const response = await emitWithAck<{ success: boolean; key: string }>(
    SocketEvents.CREATE_PARTICIPANT,
    { gameId, newParticipant, teamName },
  );

  setPlayerToken(gameId, {
    startingPosition: newParticipant.initialSeat,
    token: response.key,
  });
}

/**
 * Ask the server whether THIS device still holds `seat` — i.e. the stored
 * player token still matches the seat's current occupant. Used before a rejoin
 * routes to the play screen, so a stale token (the pair was evicted, or the
 * seat re-seated elsewhere) sends the player back to seat selection instead.
 *
 * Returns false (rather than throwing) on any failure — a missing token, a
 * server/network error, or a genuine "not held" — so the caller treats every
 * uncertain case as "pick a seat again". The secret travels in a header.
 */
export async function verifySeatHeld(
  gameId: string,
  seat: string,
): Promise<boolean> {
  const token = getPlayerToken(gameId)?.token;
  if (!token) return false;

  try {
    const res = await fetch(
      `/api/games/${gameId}/participants/${encodeURIComponent(seat)}/verify`,
      { headers: { "x-player-token": token } },
    );
    if (!res.ok) return false;
    const body = await res.json();
    return body?.result?.held === true;
  } catch {
    return false;
  }
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
 * seat. Authed by the seat's own token. Returns the code; throws the server's
 * message on failure.
 *
 * `kind` records what the claim will do: CHANGE_DEVICE (default) — the SAME pair
 * moves to a new device (plain secret rotation, no names); HANDOVER — a
 * DIFFERENT arriving pair takes over, so the claim collects their names;
 * REINSTATE — a withdrawn pair returns on a device, minted by the DIRECTOR
 * (authed with the director token, not a seat token).
 */
export async function generateSeatTransferCode(
  gameId: string,
  seat: string,
  kind: "CHANGE_DEVICE" | "HANDOVER" | "REINSTATE" = "CHANGE_DEVICE",
): Promise<string> {
  const response = await emitWithAck<{ code: string }>(
    SocketEvents.CREATE_SEAT_TRANSFER,
    {
      gameId,
      seat,
      token: getPlayerToken(gameId)?.token ?? "",
      // A REINSTATE code is minted by the director (the withdrawn pair's device
      // no longer holds a valid token), so it carries the director credential.
      ...(kind === "REINSTATE"
        ? { directorToken: getDirectorToken(gameId) ?? "" }
        : {}),
      kind,
    },
  );

  return response.code;
}

/** The arriving real pair for a handover seat-transfer claim. */
export interface SeatTransferRealPair {
  player1: HandoverSameDevicePlayer;
  player2: HandoverSameDevicePlayer;
}

/**
 * Validate a seat-transfer code WITHOUT claiming it, reporting whether its seat
 * is a §2.4.7 handover (held by a stand-in). The claim UI calls this first so
 * it knows whether to collect the arriving pair's names before the real claim.
 * No auth — the code is the credential. Throws the server's message for an
 * invalid / used / expired code.
 */
export async function inspectSeatTransfer(
  code: string,
): Promise<{ gameId: string; seat: string; isHandover: boolean }> {
  return emitWithAck<{ gameId: string; seat: string; isHandover: boolean }>(
    SocketEvents.INSPECT_SEAT_TRANSFER,
    { code },
  );
}

/**
 * Claim a seat-transfer code on a new device. No auth — the code is the
 * credential. On success the seat's secret has been rotated to a fresh token
 * (invalidating the old device); that token is stored locally and the resolved
 * game + seat are returned so the caller can route into play.
 *
 * For a §2.4.7 HANDOVER seat (held by a stand-in), pass the arriving real
 * pair's names as `realPair`: the server runs the handover engine, seating the
 * real pair with this device's new secret (and signing out the stand-in's old
 * device). A plain change-device transfer omits `realPair`.
 *
 * Throws the server's message on failure (invalid/expired/used code, the seat
 * is no longer occupied, or a handover claim missing the arriving names).
 */
export async function claimSeatTransfer(
  code: string,
  realPair?: SeatTransferRealPair,
): Promise<{ gameId: string; seat: string }> {
  const { gameId, seat, token } = await emitWithAck<{
    gameId: string;
    seat: string;
    token: string;
    isHandover: boolean;
  }>(SocketEvents.CLAIM_SEAT_TRANSFER, {
    code,
    ...(realPair ? { realPair } : {}),
  });

  setPlayerToken(gameId, { startingPosition: seat, token });

  return { gameId, seat };
}

/** A player on the arriving real pair for a same-device handover. */
export interface HandoverSameDevicePlayer {
  firstName: string;
  lastName: string;
  nationalId?: string | null;
}

/**
 * EBU §2.4.7 stand-in → real-pair handover, SAME-DEVICE variant (Path 1). The
 * arriving real pair takes over the stand-in's own device: this device proves
 * it owns the seat with its player token, the server runs the handover engine
 * and mints a fresh secret, and we store that secret locally so THIS device
 * keeps playing as the now-primary real pair (the stand-in's old secret is
 * rotated away server-side, so storing the new one is required). No options are
 * entered here — the director sets them later on the "Substitutions" screen.
 * Throws the server's message on failure (e.g. the seat already handed over).
 */
export async function handoverSameDevice(
  gameId: string,
  seat: string,
  realPair: {
    player1: HandoverSameDevicePlayer;
    player2: HandoverSameDevicePlayer;
  },
): Promise<void> {
  const { key } = await emitWithAck<{ key: string }>(
    SocketEvents.HANDOVER_SAME_DEVICE,
    {
      gameId,
      seat,
      token: getPlayerToken(gameId)?.token ?? "",
      realPair,
    },
  );

  // The stand-in's old secret was rotated server-side; keep this device working
  // by storing the real pair's new secret for the same seat.
  setPlayerToken(gameId, { startingPosition: seat, token: key });
}
