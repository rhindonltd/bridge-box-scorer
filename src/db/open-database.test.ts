import { describe, it, expect, vi, beforeEach } from "vitest";

const { created, DatabaseCtor } = vi.hoisted(() => {
  const created: Array<{
    pragma: ReturnType<typeof vi.fn>;
    close: (() => void) | ReturnType<typeof vi.fn>;
  }> = [];
  // A real (non-arrow) constructor so `new Database(...)` works under the mock.
  // `nextClose`, when set, overrides the underlying close for the NEXT opened
  // connection (consumed once) so a test can make the real close throw before
  // `openDatabase` captures and wraps it.
  function DatabaseCtor(this: unknown) {
    const close = DatabaseCtor.nextClose ?? vi.fn();
    DatabaseCtor.nextClose = undefined;
    const conn = { pragma: vi.fn(), close };
    created.push(conn);
    return conn as unknown as void;
  }
  DatabaseCtor.nextClose = undefined as undefined | (() => void);
  return { created, DatabaseCtor };
});

vi.mock("better-sqlite3", () => ({ default: DatabaseCtor }));
vi.mock("@/lib/log", () => ({ logger: { error: vi.fn() } }));

import {
  openDatabase,
  closeAllDatabases,
  openConnectionCount,
} from "./open-database";

describe("open-database", () => {
  beforeEach(() => {
    // Drain any connections a previous test left in the module-level registry
    // BEFORE clearing mocks, so each test starts from an empty registry.
    closeAllDatabases();
    vi.clearAllMocks();
    created.length = 0;
  });

  it("applies the durability pragmas and registers the connection", () => {
    const db = openDatabase("/tmp/x.db");

    expect(db.pragma).toHaveBeenCalledWith("journal_mode = WAL");
    expect(db.pragma).toHaveBeenCalledWith("synchronous = NORMAL");
    expect(db.pragma).toHaveBeenCalledWith("busy_timeout = 5000");
    expect(openConnectionCount()).toBe(1);
  });

  it("de-registers a connection closed directly by a caller", () => {
    const db = openDatabase("/tmp/x.db");
    expect(openConnectionCount()).toBe(1);

    db.close();
    expect(openConnectionCount()).toBe(0);
  });

  it("checkpoints and closes every open connection", () => {
    const a = openDatabase("/tmp/a.db") as unknown as {
      pragma: ReturnType<typeof vi.fn>;
    };
    const b = openDatabase("/tmp/b.db") as unknown as {
      pragma: ReturnType<typeof vi.fn>;
    };
    expect(openConnectionCount()).toBe(2);

    closeAllDatabases();

    // Each connection was checkpointed (folding the WAL back) before closing,
    // and the registry is fully drained.
    expect(a.pragma).toHaveBeenCalledWith("wal_checkpoint(TRUNCATE)");
    expect(b.pragma).toHaveBeenCalledWith("wal_checkpoint(TRUNCATE)");
    expect(openConnectionCount()).toBe(0);
  });

  it("continues closing others when one checkpoint throws", () => {
    const a = openDatabase("/tmp/a.db") as unknown as {
      pragma: ReturnType<typeof vi.fn>;
    };
    openDatabase("/tmp/b.db");
    a.pragma.mockImplementation((p: string) => {
      if (p === "wal_checkpoint(TRUNCATE)") throw new Error("checkpoint fail");
    });

    closeAllDatabases();

    // Despite a's failure, the registry is still fully drained.
    expect(openConnectionCount()).toBe(0);
  });

  it("continues draining when a connection's close throws", () => {
    // `openDatabase` captures the original `close` up front and wraps it, so we
    // must make the underlying close throw BEFORE opening the connection.
    DatabaseCtor.nextClose = () => {
      throw new Error("close fail");
    };
    openDatabase("/tmp/a.db");
    openDatabase("/tmp/b.db");

    closeAllDatabases();

    // Despite the first connection's close throwing, the registry is drained.
    expect(openConnectionCount()).toBe(0);
  });
});
