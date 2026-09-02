import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

/**
 * Director-only section management emitters. Each awaits the server ack so the
 * caller can surface validation errors (duplicate letters, shrink/delete
 * guards) that the handlers forward.
 */

export async function createSection(
  gameId: string,
  section: string,
  tables: number,
  label?: string,
): Promise<void> {
  await emitWithAck(SocketEvents.CREATE_SECTION, {
    gameId,
    section,
    label,
    tables,
    directorToken: getDirectorToken(gameId),
  });
}

export async function renameSection(
  gameId: string,
  section: string,
  label: string,
): Promise<void> {
  await emitWithAck(SocketEvents.RENAME_SECTION, {
    gameId,
    section,
    label,
    directorToken: getDirectorToken(gameId),
  });
}

export async function deleteSection(
  gameId: string,
  section: string,
): Promise<void> {
  await emitWithAck(SocketEvents.DELETE_SECTION, {
    gameId,
    section,
    directorToken: getDirectorToken(gameId),
  });
}

export async function updateSectionTables(
  gameId: string,
  section: string,
  tables: number,
): Promise<void> {
  await emitWithAck(SocketEvents.UPDATE_TABLES, {
    gameId,
    section,
    tables,
    directorToken: getDirectorToken(gameId),
  });
}

export async function setSectionMovementSpec(
  gameId: string,
  section: string,
  specId: number,
): Promise<void> {
  await emitWithAck(SocketEvents.SET_SECTION_MOVEMENT, {
    gameId,
    section,
    id: specId,
    directorToken: getDirectorToken(gameId),
  });
}

export async function setSectionMitchellMovement(
  gameId: string,
  section: string,
  mitchell: MitchellMovementSpec,
): Promise<void> {
  await emitWithAck(SocketEvents.SET_SECTION_MOVEMENT, {
    gameId,
    section,
    mitchell,
    directorToken: getDirectorToken(gameId),
  });
}
