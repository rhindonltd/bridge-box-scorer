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
      name: "3 Table Howell",
      rounds: 5,
      boardsPerRound: 3,
      copies: 1,
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
      copies: 1,
      pros: ["Simple"],
      cons: ["Half the field"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "MITCHELL") {
      expect(parsed.data.arrowSwitches).toBe(0);
    }
  });

  it("rejects a SPEC descriptor with an empty name", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "SPEC",
      name: "",
      rounds: 5,
      boardsPerRound: 3,
      copies: 1,
      pros: [],
      cons: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a SPEC descriptor missing rounds or copies", () => {
    const noRounds = movementDescriptorSchema.safeParse({
      type: "SPEC",
      name: "3 Table Howell",
      boardsPerRound: 3,
      copies: 1,
      pros: [],
      cons: [],
    });
    const noCopies = movementDescriptorSchema.safeParse({
      type: "SPEC",
      name: "3 Table Howell",
      rounds: 5,
      boardsPerRound: 3,
      pros: [],
      cons: [],
    });
    expect(noRounds.success).toBe(false);
    expect(noCopies.success).toBe(false);
  });

  it("rejects a MITCHELL descriptor with an unknown subtype", () => {
    const parsed = movementDescriptorSchema.safeParse({
      type: "MITCHELL",
      subtype: "SQUARE",
      tables: 4,
      rounds: 4,
      boardsPerRound: 5,
      copies: 1,
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
  it("converts a SPEC descriptor using the name->id resolver", () => {
    const descriptor: MovementDescriptor = {
      type: "SPEC",
      name: "3 Table Howell",
      rounds: 5,
      boardsPerRound: 3,
      copies: 1,
      pros: [],
      cons: [],
    };
    const resolveSpecId = (name: string) =>
      name === "3 Table Howell" ? 42 : undefined;
    expect(descriptorToSelectedMovement(descriptor, resolveSpecId)).toEqual({
      source: "SPEC",
      specId: 42,
      boardsPerRound: 3,
    });
  });

  it("throws for a SPEC descriptor when the name cannot be resolved", () => {
    const descriptor: MovementDescriptor = {
      type: "SPEC",
      name: "Unknown Movement",
      rounds: 5,
      boardsPerRound: 3,
      copies: 1,
      pros: [],
      cons: [],
    };
    expect(() => descriptorToSelectedMovement(descriptor, () => undefined)).toThrow();
  });

  it("converts a STANDARD Mitchell descriptor (no flags)", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "STANDARD",
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      arrowSwitches: 0,
      copies: 1,
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
      copies: 1,
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
      copies: 1,
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
      copies: 1,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 6, boardsPerRound: 3, hesitation: true },
    });
  });

  it("converts a WEB descriptor", () => {
    const descriptor: MovementDescriptor = {
      type: "MITCHELL",
      subtype: "WEB",
      tables: 14,
      rounds: 8,
      boardsPerRound: 3,
      arrowSwitches: 0,
      copies: 2,
      pros: [],
      cons: [],
    };
    expect(descriptorToSelectedMovement(descriptor)).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 14, rounds: 8, boardsPerRound: 3, web: true },
    });
  });
});
