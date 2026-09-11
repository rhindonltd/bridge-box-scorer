import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));
vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { POST } from "./route";

function invoke(body: unknown) {
  const req = new Request("http://localhost/api/director-codes/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

describe("POST /api/director-codes/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims a valid code, mints a session, returns the token + gameId", async () => {
    vi.mocked(validateAndClaimShareCode).mockResolvedValue({
      valid: true,
      gameId: "g1",
    });
    vi.mocked(createLoginSession).mockResolvedValue(undefined as never);

    const res = await invoke({ code: "K7M2PX" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.gameId).toBe("g1");
    expect(typeof body.result.directorToken).toBe("string");
    expect(validateAndClaimShareCode).toHaveBeenCalledWith("K7M2PX");
    expect(createLoginSession).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: "g1", role: "DIRECTOR" }),
    );
  });

  it("returns 400 with the reason when the code is invalid", async () => {
    vi.mocked(validateAndClaimShareCode).mockResolvedValue({
      valid: false,
      error: "Invalid code",
    });

    const res = await invoke({ code: "BADCOD" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Invalid code",
    });
    expect(createLoginSession).not.toHaveBeenCalled();
  });

  it("returns 400 with the reason when the code has expired", async () => {
    vi.mocked(validateAndClaimShareCode).mockResolvedValue({
      valid: false,
      error: "Code has expired",
    });

    const res = await invoke({ code: "OLDCOD" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Code has expired",
    });
  });

  it("returns 400 for an invalid payload (missing code)", async () => {
    const res = await invoke({});

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Invalid share code",
    });
    expect(validateAndClaimShareCode).not.toHaveBeenCalled();
  });

  it("returns 500 when validateAndClaimShareCode throws (infra failure)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(validateAndClaimShareCode).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await invoke({ code: "K7M2PX" });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    errSpy.mockRestore();
  });
});
