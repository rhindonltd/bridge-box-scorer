import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/socket", () => ({
  emitWithAck: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "director-tok"),
}));

import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import {
  createSection,
  renameSection,
  deleteSection,
  updateSectionTables,
  setSectionMovementSpec,
  setSectionMitchellMovement,
} from "./section-service";

const emit = vi.mocked(emitWithAck);

describe("section-service emitters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSection emits CREATE_SECTION with the director token", async () => {
    await createSection("g1", "A", 8, "North");
    expect(emit).toHaveBeenCalledWith(SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "A",
      label: "North",
      tables: 8,
      directorToken: "director-tok",
    });
  });

  it("renameSection emits RENAME_SECTION", async () => {
    await renameSection("g1", "A", "Red Room");
    expect(emit).toHaveBeenCalledWith(SocketEvents.RENAME_SECTION, {
      gameId: "g1",
      section: "A",
      label: "Red Room",
      directorToken: "director-tok",
    });
  });

  it("deleteSection emits DELETE_SECTION", async () => {
    await deleteSection("g1", "B");
    expect(emit).toHaveBeenCalledWith(SocketEvents.DELETE_SECTION, {
      gameId: "g1",
      section: "B",
      directorToken: "director-tok",
    });
  });

  it("updateSectionTables emits UPDATE_TABLES", async () => {
    await updateSectionTables("g1", "A", 12);
    expect(emit).toHaveBeenCalledWith(SocketEvents.UPDATE_TABLES, {
      gameId: "g1",
      section: "A",
      tables: 12,
      directorToken: "director-tok",
    });
  });

  it("setSectionMovementSpec emits SET_SECTION_MOVEMENT with spec id + boardsPerRound", async () => {
    await setSectionMovementSpec("g1", "A", 42, 2);
    expect(emit).toHaveBeenCalledWith(SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      id: 42,
      boardsPerRound: 2,
      directorToken: "director-tok",
    });
  });

  it("setSectionMitchellMovement emits SET_SECTION_MOVEMENT with the mitchell spec", async () => {
    const mitchell = { tables: 8, rounds: 8, boardsPerRound: 2 };
    await setSectionMitchellMovement("g1", "A", mitchell);
    expect(emit).toHaveBeenCalledWith(SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      mitchell,
      directorToken: "director-tok",
    });
  });
});
