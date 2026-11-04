import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/participant-auth", () => ({
  validatePlayerToken: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validatePlayerToken } from "@/socket/middleware/participant-auth";
import { GET } from "./route";

function invoke(gameId: string, seat: string, token?: string) {
  const req = new Request(
    `http://localhost/api/games/${gameId}/participants/${encodeURIComponent(seat)}/verify`,
    { headers: token ? { "x-player-token": token } : {} },
  );
  return GET(req, { params: Promise.resolve({ gameId, seat }) } as never);
}

describe("GET /api/games/[gameId]/participants/[seat]/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("reports held: true when the token matches the seat", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(true);

    const res = await invoke("g1", "A1NS", "secret");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, result: { held: true } });
    expect(validatePlayerToken).toHaveBeenCalledWith("g1", "A1NS", "secret");
  });

  it("reports held: false (not a 401) when the token does not match", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(false);

    const res = await invoke("g1", "A1NS", "wrong");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, result: { held: false } });
  });

  it("passes a null token through when the header is absent", async () => {
    vi.mocked(validatePlayerToken).mockResolvedValue(false);

    const res = await invoke("g1", "A1NS");
    expect(res.status).toBe(200);
    expect(validatePlayerToken).toHaveBeenCalledWith("g1", "A1NS", null);
  });

  it("rejects a malformed seat with 400 and does not check the token", async () => {
    const res = await invoke("g1", "not-a-seat", "secret");
    expect(res.status).toBe(400);
    expect(validatePlayerToken).not.toHaveBeenCalled();
  });
});
