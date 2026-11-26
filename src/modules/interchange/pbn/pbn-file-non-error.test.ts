import { describe, it, expect, vi } from "vitest";

vi.mock("@/model/deal", () => ({
  parsePbn: vi.fn(() => {
    throw "boom";
  }),
}));

import { parsePbnFile } from "./pbn-file";

describe("parsePbnFile with a non-Error throw", () => {
  it("falls back to a generic message", () => {
    const { boards, errors } = parsePbnFile(
      '[Board "1"]\n[Deal "N:a b c d"]\n',
    );
    expect(boards).toEqual([]);
    expect(errors).toEqual([
      { gameIndex: 1, boardNumber: 1, message: "Deal could not be understood" },
    ]);
  });
});
