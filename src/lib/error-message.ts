/**
 * The message from a thrown value, falling back to `fallback` when it isn't an
 * Error (or carries no message). Collapses the repeated
 * `err instanceof Error ? err.message : "..."` idiom used when surfacing a
 * failed action to the user (e.g. in an alert or inline error).
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
