import type { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertDirector } from "@/socket/middleware/director-auth";

import { createSection } from "@/db/games/actions/create-section";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { SelectedMovement } from "@/model/selected-movement";

type Cb = (res: { success: boolean; error?: string }) => void;

/**
 * Broadcast the full section list game-wide. Section membership (add / delete /
 * rename / resize) affects the whole game view, so it goes to the game room.
 */
async function broadcastSections(io: Server, gameId: string) {
  const db = await getDb(gameId);
  if (!db) return;
  const sections = await findSections(db);
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
    gameId,
    sections,
  });
}

/**
 * Register the director-only section management handlers. Section-list changes
 * broadcast GAME_UPDATED game-wide; a movement change for a single section
 * additionally emits SECTION_UPDATED to just that section's room so only its
 * clients revalidate.
 */
export function registerSectionHandlers(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_SECTION,
    async (
      {
        gameId,
        section,
        label,
        tables,
        directorToken,
      }: {
        gameId: string;
        section: string;
        label?: string;
        tables: number;
        directorToken: string;
      },
      cb?: Cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;
      try {
        await createSection(gameId, { section, label, tables });
        await broadcastSections(io, gameId);
        cb?.({ success: true });
      } catch (err) {
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  socket.on(
    SocketEvents.RENAME_SECTION,
    async (
      {
        gameId,
        section,
        label,
        directorToken,
      }: {
        gameId: string;
        section: string;
        label: string;
        directorToken: string;
      },
      cb?: Cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;
      try {
        await renameSection(gameId, section, label);
        await broadcastSections(io, gameId);
        cb?.({ success: true });
      } catch (err) {
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  socket.on(
    SocketEvents.DELETE_SECTION,
    async (
      {
        gameId,
        section,
        directorToken,
      }: { gameId: string; section: string; directorToken: string },
      cb?: Cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;
      try {
        await deleteSection(gameId, section);
        await broadcastSections(io, gameId);
        cb?.({ success: true });
      } catch (err) {
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  socket.on(
    SocketEvents.SET_SECTION_MOVEMENT,
    async (
      {
        gameId,
        section,
        id,
        mitchell,
        directorToken,
      }: {
        gameId: string;
        section: string;
        id?: number;
        mitchell?: MitchellMovementSpec;
        directorToken: string;
      },
      cb?: Cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;
      try {
        let selected: SelectedMovement | null;
        if (mitchell) {
          selected = { source: "MITCHELL", mitchell };
        } else if (id != null) {
          selected = { source: "SPEC", specId: id };
        } else {
          // No movement specified clears the section's selection.
          selected = null;
        }

        await setSectionMovement(gameId, section, selected);

        // A section's movement change only affects that section's clients.
        io.to(Rooms.section(gameId, section)).emit(
          SocketEvents.SECTION_UPDATED,
          { gameId, section },
        );
        // Also nudge the game room so the director's manage view refreshes.
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { gameId });

        cb?.({ success: true });
      } catch (err) {
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );
}
