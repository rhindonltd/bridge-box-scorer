import { NextResponse } from "next/server";
import { sql, type SQLWrapper } from "drizzle-orm";
import { getDb as getGameIndexDb } from "@/db/game-index";
import { getDb as getPlayersDb } from "@/db/players";
import { getDb as getSystemDb } from "@/db/system";
import { getVersionInfo } from "@/lib/version";

/**
 * GET /healthz
 *
 * Liveness + readiness probe for the appliance watchdog. Returns 200 only when
 * the app can serve requests AND reach its always-open core databases
 * (game-index, players, system/settings). Returns 503 otherwise.
 *
 * The device watchdog polls this every ~2 minutes to detect the "process alive
 * but HTTP dead" case that PM2's crash-restart does not cover, so this must be
 * cheap and fast: a single `SELECT 1` per core DB, no per-game DBs probed.
 */

// Always run this on demand; never cache or statically render it.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Minimal shape of a drizzle sqlite db needed for a liveness probe. */
type Probeable = { get(query: SQLWrapper | string): unknown };

/** Run a trivial query to confirm the connection is live. */
function probe(db: Probeable): void {
  // better-sqlite3 is synchronous; `.get` executes immediately.
  db.get(sql`SELECT 1`);
}

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    "game-index": "ok",
    players: "ok",
    system: "ok",
  };

  try {
    probe(getGameIndexDb());
  } catch (err) {
    console.error("healthz: game-index probe failed:", err);
    checks["game-index"] = "error";
  }

  try {
    probe(await getPlayersDb());
  } catch (err) {
    console.error("healthz: players probe failed:", err);
    checks.players = "error";
  }

  try {
    probe(await getSystemDb());
  } catch (err) {
    console.error("healthz: system probe failed:", err);
    checks.system = "error";
  }

  const healthy = Object.values(checks).every((s) => s === "ok");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      ...getVersionInfo(),
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
