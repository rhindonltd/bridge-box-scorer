import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import {
  directorAuthMiddleware,
  assertDirector,
} from "./director-auth";

function createMockSocket(auth: Record<string, unknown> = {}) {
  return {
    id: "test-socket-id",
    data: {} as { isDirector: boolean },
    handshake: { auth },
  } as any;
}

describe("directorAuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets isDirector=false and calls next() when no token provided", () => {
    const socket = createMockSocket({});
    const next = vi.fn();

    directorAuthMiddleware(socket, next);

    expect(socket.data.isDirector).toBe(false);
    expect(next).toHaveBeenCalledWith();
  });

  it("sets isDirector=true when token resolves to a DIRECTOR session", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
    } as any);

    const socket = createMockSocket({ directorToken: "valid-token" });
    const next = vi.fn();

    directorAuthMiddleware(socket, next);

    expect(socket.data.isDirector).toBe(true);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves isDirector=false when token resolves to a non-DIRECTOR session", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "player-token",
      role: "PLAYER",
    } as any);

    const socket = createMockSocket({ directorToken: "player-token" });
    const next = vi.fn();

    directorAuthMiddleware(socket, next);

    expect(socket.data.isDirector).toBe(false);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves isDirector=false when session is null", () => {
    vi.mocked(findLoginSession).mockReturnValue(null);

    const socket = createMockSocket({ directorToken: "unknown-token" });
    const next = vi.fn();

    directorAuthMiddleware(socket, next);

    expect(socket.data.isDirector).toBe(false);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves isDirector=false and calls next() when findLoginSession throws", () => {
    vi.mocked(findLoginSession).mockImplementation(() => {
      throw new Error("DB failure");
    });

    const socket = createMockSocket({ directorToken: "crash-token" });
    const next = vi.fn();

    directorAuthMiddleware(socket, next);

    expect(socket.data.isDirector).toBe(false);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("assertDirector", () => {
  it("returns true for a director socket", () => {
    const socket = createMockSocket();
    socket.data.isDirector = true;

    expect(assertDirector(socket)).toBe(true);
  });

  it("returns false for a non-director socket", () => {
    const socket = createMockSocket();
    socket.data.isDirector = false;

    expect(assertDirector(socket)).toBe(false);
  });

  it("invokes callback with error for non-director socket", () => {
    const socket = createMockSocket();
    socket.data.isDirector = false;
    const cb = vi.fn();

    assertDirector(socket, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
  });

  it("does not invoke callback for director socket", () => {
    const socket = createMockSocket();
    socket.data.isDirector = true;
    const cb = vi.fn();

    assertDirector(socket, cb);

    expect(cb).not.toHaveBeenCalled();
  });
});
