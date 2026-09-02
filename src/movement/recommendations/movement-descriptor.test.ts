import { describe, it, expect } from "vitest";
import {
  movementDescriptorSchema,
  descriptorToSelectedMovement,
  MovementDescriptor,
} from "./movement-descriptor";

describe("movementDescriptorSchema", () => {
  it("accepts a valid SPEC descriptor", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "SPEC",
      id: 42,
      boardsPerRound: 3,
      pros: ["Every pair plays every other pair"],
      cons: ["One stationary pair only"],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid MITCHELL descriptor and defaults arrowSwitches to 0", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "MITCHELL",
      subtype: "STANDARD",
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      pros: ["Simple"],
      cons: ["Half the field"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "MITCHELL") {
      expect(parsed.data.arrowSwitches).toBe(0);
    }
  });

  it("rejects a SPEC descriptor with a non-positive id", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "SPEC",
      id: 0,
      boardsPerRound: 3,
      pros: [],
      cons: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a MITCHELL descriptor with an unknown subtype", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "MITCHELL",
      subtype: "SQUARE",
      tables: 4,
      rounds: 4,
      boardsPerRound: 5,
      pros: [],
      cons: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown descriptor type", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "OTHER",
      id: 1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("descriptorToSelectedMovement", () => {
  it("converts a SPEC descriptor", () => {
    const descriptor: MovementDescriptor = {
      type: "SPEC",
      id: 42,
      boardsPerRound: 3,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "SPEC",
      specId: 42,
      boardsPerRound: 3,
    });
  });

  it("converts a STANDARD Mitchell descriptor (no flags)", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "STANDARD",
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      arrowSwitches: 0,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 5, boardsPerRound: 5 },
    });
  });

  it("converts a SHARE_AND_RELAY descriptor with arrow switches", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "SHARE_AND_RELAY",
      tables: 6,
      rounds: 6,
      boardsPerRound: 4,
      arrowSwitches: 1,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: {
        tables: 6,
        rounds: 6,
        boardsPerRound: 4,
        arrowSwitchRounds: 1,
        shareAndRelay: true,
      },
    });
  });

  it("converts a SKIP descriptor", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "SKIP",
      tables: 6,
      rounds: 6,
      boardsPerRound: 4,
      arrowSwitches: 0,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 6, rounds: 6, boardsPerRound: 4, skip: true },
    });
  });

  it("converts a HESITATION descriptor", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "HESITATION",
      tables: 5,
      rounds: 6,
      boardsPerRound: 3,
      arrowSwitches: 0,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 6, boardsPerRound: 3, hesitation: true },
    });
  });
});
