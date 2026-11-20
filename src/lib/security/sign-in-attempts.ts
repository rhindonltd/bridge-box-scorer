/**
 * Tracks failed sign-in attempts (Become Director and the Settings admin-key
 * unlock) per device, to spot someone trying to guess their way in.
 *
 * - Three failures from one device within {@link FAILURE_WINDOW_MS} is a
 *   "burst": it is reported once, and the device is then refused for
 *   {@link BLOCK_MS}.
 * - A success from a device clears its count.
 *
 * Both sign-ins accept the admin key, so their failures count together.
 *
 * State lives on `globalThis` (see the cross-bundle rule in the tech notes):
 * dev-mode hot reload would otherwise wipe it, and every route bundle must
 * see the same counts. It is in memory only, so a restart clears it.
 */

export const FAILURE_LIMIT = 3;
export const FAILURE_WINDOW_MS = 2 * 60 * 1000;
export const BLOCK_MS = 5 * 60 * 1000;

/** What a sign-in attempt was for. */
export type SignInTarget =
  { kind: "game"; gameId: string } | { kind: "settings" };

interface DeviceRecord {
  failures: { at: number; target: SignInTarget }[];
  blockedUntil: number | null;
}

interface Store {
  devices: Map<string, DeviceRecord>;
}

const KEY = "__bridgeBoxSignInAttempts";
type GlobalWithStore = typeof globalThis & { [KEY]?: Store };

function store(): Store {
  const g = globalThis as GlobalWithStore;
  if (!g[KEY]) g[KEY] = { devices: new Map() };
  return g[KEY];
}

function record(address: string): DeviceRecord {
  const devices = store().devices;
  let r = devices.get(address);
  if (!r) {
    r = { failures: [], blockedUntil: null };
    devices.set(address, r);
  }
  return r;
}

/**
 * Milliseconds until this device may try again, or null when it isn't blocked.
 */
export function blockedFor(address: string, now = Date.now()): number | null {
  const r = store().devices.get(address);
  if (!r?.blockedUntil) return null;
  if (now >= r.blockedUntil) {
    r.blockedUntil = null;
    return null;
  }
  return r.blockedUntil - now;
}

export type FailureOutcome =
  | { burst: false }
  | {
      burst: true;
      /** Each distinct thing the device was trying to sign in to. */
      targets: SignInTarget[];
      failures: number;
    };

function sameTarget(a: SignInTarget, b: SignInTarget): boolean {
  return a.kind === "settings"
    ? b.kind === "settings"
    : b.kind === "game" && a.gameId === b.gameId;
}

/**
 * Record a failed attempt. Returns a burst (and blocks the device) when this
 * is the third failure within the window.
 */
export function recordFailure(
  address: string,
  target: SignInTarget,
  now = Date.now(),
): FailureOutcome {
  const r = record(address);
  r.failures = r.failures.filter((f) => now - f.at < FAILURE_WINDOW_MS);
  r.failures.push({ at: now, target });
  if (r.failures.length < FAILURE_LIMIT) return { burst: false };

  const targets: SignInTarget[] = [];
  for (const f of r.failures) {
    if (!targets.some((t) => sameTarget(t, f.target))) targets.push(f.target);
  }
  const failures = r.failures.length;
  r.failures = [];
  r.blockedUntil = now + BLOCK_MS;
  return { burst: true, targets, failures };
}

/** A successful sign-in clears the device's failures. */
export function recordSuccess(address: string): void {
  store().devices.delete(address);
}

/** Forget everything (tests). */
export function resetSignInAttempts(): void {
  store().devices.clear();
}
