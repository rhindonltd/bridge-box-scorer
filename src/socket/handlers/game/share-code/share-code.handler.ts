import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { assertDirector } from "@/socket/middleware/director-auth";
import { createShareCode } from "@/db/system/actions/create-share-code";
import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { z } from "zod";

const generateSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
});

const claimSchema = z.object({
  code: z.string().min(1),
});

export function registerShareCodeHandlers(socket: Socket, io: Server) {
  /**
   * GENERATE_SHARE_CODE — current director requests a share code.
   * Requires director auth for the game.
   */
  socket.on(
    SocketEvents.GENERATE_SHARE_CODE,
    async (payload: unknown, cb?: (res: { success: boolean; code?: string; error?: string }) => void) => {
      const parsed = generateSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, directorToken } = parsed.data;
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const code = await createShareCode(gameId);
        cb?.({ success: true, code });
      } catch (err) {
        console.error("Failed to generate share code:", err);
        cb?.({ success: false, error: "Failed to generate code" });
      }
    },
  );

  /**
   * CLAIM_DIRECTOR_CODE — anyone submits a share code to become a director.
   * No auth required (that's the point — they don't have a token yet).
   */
  socket.on(
    SocketEvents.CLAIM_DIRECTOR_CODE,
    async (payload: unknown, cb?: (res: { success: boolean; directorToken?: string; gameId?: string; error?: string }) => void) => {
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
