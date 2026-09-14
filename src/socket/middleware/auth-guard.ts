/**
 * The unauthorized-rejection callback both socket auth guards
 * ({@link assertPlayer} / {@link assertDirector}) use. Shared so the response
 * shape and message live in one place rather than being repeated in each guard.
 */
export type UnauthorizedCallback = (response: {
  success: false;
  error: string;
}) => void;

/** Invoke the callback with the standard Unauthorized rejection and return false. */
export function rejectUnauthorized(cb?: UnauthorizedCallback): false {
  cb?.({ success: false, error: "Unauthorized" });
  return false;
}
