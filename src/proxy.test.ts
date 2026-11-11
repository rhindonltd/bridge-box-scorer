import { describe, it, expect, vi, afterEach } from "vitest";

/** Minimal NextRequest: the proxy only reads nextUrl and the host header. */
function req(pathname: string, host: string | null = "example.com"): any {
  return {
    nextUrl: new URL(`http://${host ?? "example.com"}${pathname}`),
    headers: { get: (n: string) => (n === "host" ? host : null) },
  };
}

async function loadProxy(redirectPaths?: string) {
  vi.resetModules();
  if (redirectPaths === undefined) vi.stubEnv("CAPTIVE_REDIRECT_PATHS", "");
  else vi.stubEnv("CAPTIVE_REDIRECT_PATHS", redirectPaths);
  return import("./proxy");
}

describe("proxy (captive-portal probes)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes non-probe requests through to normal routing", async () => {
    const { proxy } = await loadProxy();
    const res = proxy(req("/game/abc"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("answers a known probe path with its expected success response", async () => {
    const { proxy } = await loadProxy();
    const res = proxy(req("/generate_204"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Type")).toBe("text/plain");
  });

  it("serves a body for probes that expect one", async () => {
    const { proxy } = await loadProxy();
    const res = proxy(req("/hotspot-detect.html"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Success");
  });

  it("falls through for a host-only probe on a path with no descriptor", async () => {
    const { proxy } = await loadProxy();
    const res = proxy(req("/", "captive.apple.com"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("302s opted-in probe paths to the app root", async () => {
    const { proxy } = await loadProxy(" /Hotspot-Detect.html , ,/other");
    const res = proxy(req("/hotspot-detect.html"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://example.com/");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("leaves other probes on silent-accept when only some paths opt in", async () => {
    const { proxy } = await loadProxy("/hotspot-detect.html");
    expect(proxy(req("/generate_204")).status).toBe(204);
  });

  it("treats an unset CAPTIVE_REDIRECT_PATHS as no opt-ins", async () => {
    vi.resetModules();
    delete process.env.CAPTIVE_REDIRECT_PATHS;
    const { proxy } = await import("./proxy");
    expect(proxy(req("/generate_204")).status).toBe(204);
  });

  it("exports a matcher covering the probe paths", async () => {
    const { config } = await loadProxy();
    expect(config.matcher).toContain("/generate_204");
  });
});
