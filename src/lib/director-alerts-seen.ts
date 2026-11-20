/**
 * Director alerts this device has already dealt with: dismissed ones, and
 * the alerts raised by this device's own sign-ins (which it should never show).
 * Kept in localStorage so a replayed alert isn't shown again after a reload.
 */
const KEY = "director-alerts:seen";
/** Plenty for the 30 minutes the server keeps alerts. */
const MAX = 200;

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/** Whether this device has already dismissed (or raised) the alert. */
export function isAlertSeen(id: string): boolean {
  return read().includes(id);
}

/** Remember the alert as dealt with. */
export function markAlertSeen(id: string): void {
  if (typeof localStorage === "undefined") return;
  const ids = read().filter((x) => x !== id);
  ids.push(id);
  localStorage.setItem(KEY, JSON.stringify(ids.slice(-MAX)));
}

/**
 * Start a sign-in from this device: returns a fresh random id to send with it,
 * already remembered here, so the alert it raises is recognised as this
 * device's own even if it arrives before the sign-in reply.
 */
export function newOwnSignInId(): string {
  const id = crypto.randomUUID();
  markAlertSeen(`origin:${id}`);
  return id;
}

/** Whether an alert should be hidden on this device. */
export function isAlertHidden(alert: {
  id: string;
  originId?: string;
}): boolean {
  return (
    isAlertSeen(alert.id) ||
    (alert.originId !== undefined && isAlertSeen(`origin:${alert.originId}`))
  );
}
