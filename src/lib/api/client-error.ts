import { NextResponse } from "next/server";

/**
 * A user-facing error in a request: something the caller got wrong (bad input,
 * a violated precondition), as opposed to an internal failure. Routes map it to
 * a 400 with its message; anything else is treated as a 500.
 */
export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

/**
 * Map a thrown error to a route response:
 * - {@link ClientError} → 400 with the (safe, user-facing) message.
 * - anything else → 500 "Internal server error", logged with `context`.
 */
export function respondToActionError(err: unknown, context: string): NextResponse {
  if (err instanceof ClientError) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 },
    );
  }

  console.error(context, err);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 },
  );
}
