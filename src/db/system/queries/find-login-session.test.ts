import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockWhere, mockFrom, mockSelect, mockDrizzle } = vi.hoisted(
  () => {
    const mockGet = vi.fn();
    const mockWhere = vi.fn(() => ({ get: mockGet }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockDrizzle = vi.fn(() => ({ select: mockSelect }));
    return { mockGet, mockWhere, mockFrom, mockSelect, mockDrizzle };
  },
);

vi.mock("better-sqlite3", () => ({
  default: class MockDatabase {},
}));

vi.mock("drizzle-orm/better-sqlite3", () => ({
  drizzle: mockDrizzle,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock("@/db/system/schema", () => ({
  loginSessions: {
    token: "token_column",
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join("/")),
  },
}));

import { findLoginSession } from "./find-login-session";

describe("findLoginSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session when found", () => {
    const session = { token: "abc", gameId: "g1", role: "director" };
    mockGet.mockReturnValue(session);

    const result = findLoginSession("abc");

    expect(result).toEqual(session);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("returns null when no session is found (undefined from get)", () => {
    mockGet.mockReturnValue(undefined);

    const result = findLoginSession("nonexistent");

    expect(result).toBeNull();
  });
});
