import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { updateSectionTables } from "@/db/games/actions/update-section-tables";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  // The section to resize. Defaults to "A" so single-section callers keep
  // working; the multi-section manage UI always sends an explicit section.
  section: z.string().min(1).default("A"),
  tables: z.number().int().min(1),
  directorToken: z.string().min(1),
});

/**
 * Set the number of tables for a single section. The per-section shrink guard
 * (rejecting a reduction below a seated table) lives in updateSectionTables.
 */
export function registerUpdateTablesHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.UPDATE_TABLES,
    async (
      payload: unknown,
      cb?: (res: { success: boolean; error?: string }) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, section, tables, directorToken } = parsed.data;
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const game = await findGameById(gameId);
        if (!game) {
          cb?.({ success: false, error: "Game not found" });
          return;
        }

        const db = await getDb(gameId);
        if (!db) {
          cb?.({ success: false, error: "Game db not found" });
          return;
        }

        const sections = await findSections(db);
        if (!sections.some((s) => s.section === section)) {
          cb?.({
            success: false,
            error: `Section ${section} not found`,
          });
          return;
        }

        // updateSectionTables enforces the per-section shrink guard and throws
        // a descriptive error when a seated table would be removed.
        await updateSectionTables(gameId, section, tables);

        const updatedGame = await findGameById(gameId);
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
          game: updatedGame,
        });

        cb?.({ success: true });
      } catch (err) {
        // The shrink guard surfaces a user-facing message; forward it.
        const message =
          err instanceof Error && /seated participants|Section /.test(err.message)
            ? err.message
            : "Internal server error";
        if (message === "Internal server error") {
          console.error(
            `Failed to update tables for game ${gameId} section ${section}:`,
            err,
          );
        }
        cb?.({ success: false, error: message });
      }
    },
  );
}
