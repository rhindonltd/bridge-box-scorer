import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { z } from "zod";

const claimSchema = z.object({
  code: z.string().min(1),
});

// NOTE: generating a share code is an HTTP route (POST
// /api/games/[gameId]/share-code), not a socket event — it's a director-only
// one-shot mutation whose result (the code) goes back to the caller only.
// Claiming a code stays on the socket: the claimer has no director token yet,
// so it can't ride the director-authed HTTP path.
export function registerShareCodeHandlers(socket: Socket, _io: Server) {
  /**
   * CLAIM_DIRECTOR_CODE — anyone submits a share code to become a director.
   * No auth required (that's the point — they don't have a token yet).
   */
  socket.on(
    SocketEvents.CLAIM_DIRECTOR_CODE,
    async (
      payload: unknown,
      cb?: (res: {
        success: boolean;
        directorToken?: string;
        gameId?: string;
        error?: string;
      }) => void,
    ) => {
      const parsed = claimSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { code } = parsed.data;

      try {
        const result = await validateAndClaimShareCode(code);

        if (!result.valid) {
          cb?.({ success: false, error: result.error });
          return;
        }

        // Create a director login session for the claiming user
        const directorToken = crypto.randomUUID();
        await createLoginSession({
          token: directorToken,
          gameId: result.gameId,
          role: "DIRECTOR",
        });

        cb?.({ success: true, directorToken, gameId: result.gameId });
      } catch (err) {
        console.error("Failed to claim director code:", err);
        cb?.({ success: false, error: "Failed to claim code" });
      }
    },
  );
}
