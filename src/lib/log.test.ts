import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The logger reads NODE_ENV / LOG_LEVEL at module-eval time and picks its
// transport accordingly. We force a production-style (no pino-pretty transport)
// JSON logger and capture stdout so we can assert on the emitted records.
describe("logger", () => {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let lines: string[];

  beforeEach(() => {
    vi.resetModules();
    lines = [];
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "info");
    // Capture what pino writes (it writes to fd 1 / process.stdout by default).
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
      lines.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.stdout.write = originalWrite;
  });

  function records() {
    return lines
      .join("")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  it("emits structured JSON with the message and fields", async () => {
    const { logger } = await import("./log");
    logger.info({ gameId: "g1", tables: 8 }, "created game");

    const [rec] = records();
    expect(rec.msg).toBe("created game");
    expect(rec.gameId).toBe("g1");
    expect(rec.tables).toBe(8);
    expect(rec.level).toBe(30); // pino: info === 30
  });

  it("redacts secret fields at the top level and under wrappers", async () => {
    const { logger } = await import("./log");
    logger.info(
      {
        token: "player-secret",
        directorToken: "dir-secret",
        secretKey: "key",
        nationalId: "123456",
        code: "ABC234",
        payload: { token: "nested-secret", gameId: "g1" },
      },
      "auth attempt",
    );

    const [rec] = records();
    expect(rec.token).toBe("[redacted]");
    expect(rec.directorToken).toBe("[redacted]");
    expect(rec.secretKey).toBe("[redacted]");
    expect(rec.nationalId).toBe("[redacted]");
    expect(rec.code).toBe("[redacted]");
    expect(rec.payload.token).toBe("[redacted]");
    // Non-secret siblings are preserved.
    expect(rec.payload.gameId).toBe("g1");
  });

  it("redacts the x-admin-token request header", async () => {
    const { logger } = await import("./log");
    logger.info(
      { req: { headers: { "x-admin-token": "super-secret" } } },
      "admin request",
    );

    const [rec] = records();
    expect(rec.req.headers["x-admin-token"]).toBe("[redacted]");
  });

  it("respects LOG_LEVEL (debug is dropped at info)", async () => {
    const { logger } = await import("./log");
    logger.debug("this should not appear");
    logger.info("this should appear");

    const msgs = records().map((r) => r.msg);
    expect(msgs).toContain("this should appear");
    expect(msgs).not.toContain("this should not appear");
  });

  it("childLogger stamps bindings (correlation id) on every line", async () => {
    const { childLogger } = await import("./log");
    const log = childLogger({ correlationId: "abc-123" });
    log.info("in a request");

    const [rec] = records();
    expect(rec.correlationId).toBe("abc-123");
    expect(rec.msg).toBe("in a request");
  });

  it("serializes an error under `err` with type/message", async () => {
    const { logger } = await import("./log");
    logger.error({ err: new Error("boom") }, "operation failed");

    const [rec] = records();
    expect(rec.err.type).toBe("Error");
    expect(rec.err.message).toBe("boom");
    expect(rec.msg).toBe("operation failed");
  });
});
