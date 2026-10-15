import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * The middleware reads its escape-hatch env var at module load, so these tests
 * set the env and import the module fresh per case via `vi.resetModules()` +
 * dynamic import.
 */
async function loadMiddleware() {
  const mod = await import("./middleware");
  return mod.middleware;
}

function makeRequest(pathname: string, host = "bridge.local") {
  return {
    nextUrl: new URL(`http://${host}${pathname}`),
    headers: new Headers({ host }),
  } as unknown as import("next/server").NextRequest;
}

describe("captive-portal middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.CAPTIVE_REDIRECT_PATHS;
  });

  afterEach(() => {
    delete process.env.CAPTIVE_REDIRECT_PATHS;
  });

  it("answers the Android / Fire OS probe with 204 empty (silent accept, no sheet)", async () => {
    const middleware = await loadMiddleware();
    const res = middleware(makeRequest("/generate_204"));

    expect(res.status).toBe(204);
    await expect(res.text()).resolves.toBe("");
    // A 204 is a success, not a redirect, so no sign-in sheet.
    expect(res.headers.get("location")).toBeNull();
  });

  it("answers the iOS probe with the exact Success document", async () => {
    const middleware = await loadMiddleware();
    const res = middleware(makeRequest("/hotspot-detect.html"));

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(
      "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>",
    );
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("answers the Windows probes with their exact bodies", async () => {
    const middleware = await loadMiddleware();

    const connect = middleware(makeRequest("/connecttest.txt"));
    expect(connect.status).toBe(200);
    await expect(connect.text()).resolves.toBe("Microsoft Connect Test");

    const ncsi = middleware(makeRequest("/ncsi.txt"));
    await expect(ncsi.text()).resolves.toBe("Microsoft NCSI");
  });

  it("never redirects a probe by default (a redirect is what pops the sheet)", async () => {
    const middleware = await loadMiddleware();

    for (const path of [
      "/generate_204",
      "/hotspot-detect.html",
      "/connecttest.txt",
      "/canonical.html",
    ]) {
      const res = middleware(makeRequest(path));
      expect(res.status).not.toBe(302);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("falls through to the app for a non-probe request", async () => {
    const middleware = await loadMiddleware();
    const res = middleware(makeRequest("/game/123"));

    // NextResponse.next() carries no redirect and a non-error status.
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBeLessThan(400);
  });

  it("falls through to the app (main menu) for a host-only probe at /", async () => {
    const middleware = await loadMiddleware();
    // A known detection domain requesting "/" has no probe-path descriptor; the
    // user should land on the main menu, not be redirected.
    const res = middleware(makeRequest("/", "captive.apple.com"));

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBeLessThan(400);
  });

  it("uses the 302-to-app escape hatch only for opted-in paths", async () => {
    process.env.CAPTIVE_REDIRECT_PATHS = "/hotspot-detect.html";
    const middleware = await loadMiddleware();

    // Opted-in path: 302 (reintroduces the sheet for this OS only).
    const redirected = middleware(makeRequest("/hotspot-detect.html"));
    expect(redirected.status).toBe(302);
    expect(redirected.headers.get("location")).toContain("/");

    // A different probe still gets its silent-accept success response.
    const other = middleware(makeRequest("/generate_204"));
    expect(other.status).toBe(204);
  });
});
