import { NextResponse } from "next/server";
import { z } from "zod";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { clientAddress } from "@/lib/net/client-address";
import {
  BLOCK_MS,
  blockedFor,
  recordFailure,
  recordSuccess,
  type SignInTarget,
} from "@/lib/security/sign-in-attempts";
import type { AlertAudience, NewDirectorAlert } from "@/model/director-alert";
import { identifyDevice } from "./identify-device";

/**
 * The seats a device holds, sent with a sign-in attempt so the director alert
 * can say who it is. Each is proven by the seat's own secret token.
 */
export const heldSeatsSchema = z
  .array(
    z.object({
      gameId: z.string().min(1),
      seat: z.string().min(1),
      token: z.string().min(1),
    }),
  )
  .max(10)
  .optional();

export type HeldSeats = z.infer<typeof heldSeatsSchema>;

/** The random id a device sends so it can recognise its own sign-in alert. */
export const originIdSchema = z.string().min(1).max(64).optional();

/**
 * Refuse a sign-in from a device that is blocked after repeated failures.
 * Returns the 429 response to send, or null to carry on.
 */
export function blockedResponse(req: Request): NextResponse | null {
  const ms = blockedFor(clientAddress(req));
  if (ms === null) return null;
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return NextResponse.json(
    {
      success: false,
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429 },
  );
}

async function audienceFor(target: SignInTarget): Promise<AlertAudience> {
  if (target.kind === "settings") return target;
  const game = await findGameById(target.gameId);
  return {
    kind: "game",
    gameId: target.gameId,
    eventName: game?.eventName ?? "a game that no longer exists",
  };
}

/**
 * Sends a director alert. The routes pass the socket layer's
 * `raiseDirectorAlert`, so this service does not reach into the socket layer.
 */
export type RaiseAlert = (alert: NewDirectorAlert) => unknown;

/**
 * A sign-in succeeded: clear the device's failures and tell the directors.
 * The alert carries the device's `originId`, which only that device knows, so
 * it can skip its own alert.
 */
export async function signInSucceeded(
  raiseAlert: RaiseAlert,
  req: Request,
  target: SignInTarget,
  method: "shareCode" | "adminKey",
  seats: HeldSeats,
  originId?: string,
): Promise<void> {
  recordSuccess(clientAddress(req));
  raiseAlert({
    kind: "signedIn",
    audience: await audienceFor(target),
    method,
    seatedAs: await identifyDevice(seats ?? []),
    ...(originId ? { originId } : {}),
  });
}

/**
 * A sign-in failed. On the third failure from the device within the window,
 * tell the directors of everything it was trying to get into; the device is
 * then blocked.
 */
export async function signInFailed(
  raiseAlert: RaiseAlert,
  req: Request,
  target: SignInTarget,
  seats: HeldSeats,
): Promise<void> {
  const outcome = recordFailure(clientAddress(req), target);
  if (!outcome.burst) return;
  const seatedAs = await identifyDevice(seats ?? []);
  for (const t of outcome.targets) {
    raiseAlert({
      kind: "repeatedFailures",
      audience: await audienceFor(t),
      failures: outcome.failures,
      blockedMinutes: BLOCK_MS / 60_000,
      seatedAs,
    });
  }
}
