import { getDirectorToken } from "@/lib/director-token";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

/**
 * Director-only section management calls. These go over HTTP (not the socket):
 * the director token travels in the `x-director-token` header, and the server
 * broadcasts the resulting live update. Each awaits the response and throws
 * with the server's error message on failure so callers can surface validation
 * errors (duplicate letters, shrink/delete guards).
 */

/** Perform a director-authed section request, throwing on a non-ok response. */
async function directorFetch(
  gameId: string,
  path: string,
  init: { method: string; body?: unknown },
): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/sections${path}`, {
    method: init.method,
    headers: {
      "x-director-token": getDirectorToken(gameId) ?? "",
      ...(init.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Request failed");
  }
}

const sectionPath = (section: string) => `/${encodeURIComponent(section)}`;

export async function createSection(
  gameId: string,
  section: string,
  tables: number,
  label?: string,
): Promise<void> {
  await directorFetch(gameId, "", {
    method: "POST",
    body: { section, label, tables },
  });
}

export async function renameSection(
  gameId: string,
  section: string,
  label: string,
): Promise<void> {
  await directorFetch(gameId, sectionPath(section), {
    method: "PATCH",
    body: { label },
  });
}

export async function deleteSection(
  gameId: string,
  section: string,
): Promise<void> {
  await directorFetch(gameId, sectionPath(section), { method: "DELETE" });
}

export async function updateSectionTables(
  gameId: string,
  section: string,
  tables: number,
): Promise<void> {
  await directorFetch(gameId, `${sectionPath(section)}/tables`, {
    method: "PUT",
    body: { tables },
  });
}

export async function setSectionMovementSpec(
  gameId: string,
  section: string,
  specId: number,
  boardsPerRound: number,
): Promise<void> {
  await directorFetch(gameId, `${sectionPath(section)}/movement`, {
    method: "PUT",
    body: { id: specId, boardsPerRound },
  });
}

export async function setSectionMitchellMovement(
  gameId: string,
  section: string,
  mitchell: MitchellMovementSpec,
): Promise<void> {
  await directorFetch(gameId, `${sectionPath(section)}/movement`, {
    method: "PUT",
    body: { mitchell },
  });
}
