import { parseSeat } from "@/model/participants";
import type { TeamMatchRow, TeamMatchStructureRow } from "./team-match";

/**
 * TEST-ONLY: derive the `matches`-structure rows a set of Swiss Teams board
 * rows implies, so the pure structure readers (`groupTeamMatches`,
 * `groupTeamTriples`, `teamByeRounds`) can be unit-tested from board-row
 * scenarios without a real materialised database.
 *
 * In production these rows are WRITTEN by the materialiser and READ back; this
 * helper reconstructs the same shapes from the board topology (the inference
 * the production readers no longer do). It lives OUTSIDE the production module
 * on purpose — it is scaffolding for the unit tests, not a code path the app
 * ships. The int tests (parity, leaderboard, mismatch) exercise the real
 * materialiser-written rows end-to-end.
 *
 * Topology rules (mirroring the materialiser):
 *  - A SIT_OUT row → a BYE match (its NS team sits out).
 *  - A table facing TWO distinct opponents in a round → a SHORT triple (that
 *    table + its two opponents), three TRIPLE comparison rows (vpPool 10).
 *  - Three single-opponent tables forming a non-mutual 3-cycle across two
 *    consecutive rounds → a LONG triple, three TRIPLE comparison rows
 *    (vpPool 20).
 *  - Every other mutual two-table pairing → one TEAMS match (vpPool 20).
 */
export function teamMatchStructureFromRows<R extends TeamMatchRow>(
  rows: R[],
): TeamMatchStructureRow[] {
  const out: TeamMatchStructureRow[] = [];

  const teamId = (section: string, table: number) => `${section}${table}NS`;

  // --- Byes: one BYE match per (section, round, team), spanning all its rows ---
  const byeBoards = new Map<
    string,
    { section: string; round: number; table: number; boards: Set<number> }
  >();
  for (const row of rows) {
    if (row.status !== "SIT_OUT") continue;
    let table: number;
    try {
      table = parseSeat(row.ns).tableNumber;
    } catch {
      continue;
    }
    const key = `${row.section}|${row.roundNumber}|${table}`;
    const entry =
      byeBoards.get(key) ??
      {
        section: row.section,
        round: row.roundNumber,
        table,
        boards: new Set<number>(),
      };
    entry.boards.add(row.boardNumber);
    byeBoards.set(key, entry);
  }
  for (const { section, round, table, boards } of byeBoards.values()) {
    const sorted = [...boards].sort((a, b) => a - b);
    out.push({
      section,
      roundNumber: round,
      kind: "BYE",
      home: teamId(section, table),
      opponent: null,
      groupId: null,
      vpPool: null,
      boardStart: sorted[0],
      boardEnd: sorted[sorted.length - 1],
    });
  }

  // --- Per (section,round) home-table → opponent tables (board spans too) ---
  interface Rel {
    boards: Set<number>;
  }
  const perRound = new Map<string, Map<number, Map<number, Rel>>>();
  for (const row of rows) {
    if (row.status === "SIT_OUT" || row.status === "HALF_AVERAGE") continue;
    let home: number;
    let opp: number;
    try {
      home = parseSeat(row.ns).tableNumber;
      opp = parseSeat(row.ew).tableNumber;
    } catch {
      continue;
    }
    const rkey = `${row.section}|${row.roundNumber}`;
    const byHome = perRound.get(rkey) ?? new Map<number, Map<number, Rel>>();
    const opps = byHome.get(home) ?? new Map<number, Rel>();
    const rel = opps.get(opp) ?? { boards: new Set<number>() };
    rel.boards.add(row.boardNumber);
    opps.set(opp, rel);
    byHome.set(home, opps);
    perRound.set(rkey, byHome);
  }

  // --- SHORT triples: a table with >=2 opponents in a round ---
  const shortTripleTables = new Set<string>(); // `${section}|${round}|${table}`
  for (const [rkey, byHome] of perRound) {
    const [section, roundStr] = rkey.split("|");
    const round = Number(roundStr);
    const seen = new Set<number>();
    for (const [home, opps] of byHome) {
      if (opps.size < 2 || seen.has(home)) continue;
      const members = [home, ...opps.keys()].sort((a, b) => a - b);
      if (members.length !== 3) continue;
      for (const m of members) {
        seen.add(m);
        shortTripleTables.add(`${section}|${round}|${m}`);
      }
      // Three comparisons x-y, x-z, y-z, each on its own board span.
      const pairs: [number, number][] = [
        [members[0], members[1]],
        [members[0], members[2]],
        [members[1], members[2]],
      ];
      const groupId = `triple|${section}|${members.join("-")}`;
      for (const [lo, hi] of pairs) {
        const span = spanBetween(byHome, lo, hi);
        out.push({
          section,
          roundNumber: round,
          kind: "TRIPLE",
          home: teamId(section, lo),
          opponent: teamId(section, hi),
          groupId,
          vpPool: 10,
          boardStart: span.start,
          boardEnd: span.end,
          // A triple comparison can carry its own §3.5 mismatch (F21 Part B),
          // lifted home-relative to its lower (lo) table from the board tokens
          // within this comparison's own board span.
          ruling: tripleRulingHomeRelative(rows, section, lo, hi, span),
        });
      }
    }
  }

  // --- LONG triples: non-mutual 3-cycles across consecutive rounds ---
  const longTripleTables = new Set<string>();
  const longTrios = new Map<
    string,
    { section: string; teams: number[]; rounds: Set<number> }
  >();
  for (const [rkey, byHome] of perRound) {
    const [section, roundStr] = rkey.split("|");
    const round = Number(roundStr);
    const single = new Map<number, number>();
    for (const [home, opps] of byHome) {
      if (opps.size === 1) single.set(home, [...opps.keys()][0]);
    }
    const seen = new Set<number>();
    for (const [x, y] of single) {
      if (seen.has(x)) continue;
      if (single.get(y) === x) continue; // mutual = ordinary match
      const z = single.get(y);
      if (z === undefined) continue;
      if (single.get(z) === x && new Set([x, y, z]).size === 3) {
        for (const m of [x, y, z]) seen.add(m);
        const teams = [x, y, z].sort((a, b) => a - b);
        const trioKey = `${section}|${teams.join("-")}`;
        const entry =
          longTrios.get(trioKey) ?? { section, teams, rounds: new Set<number>() };
        entry.rounds.add(round);
        longTrios.set(trioKey, entry);
      }
    }
  }
  for (const { section, teams, rounds } of longTrios.values()) {
    for (const round of rounds) {
      for (const t of teams) longTripleTables.add(`${section}|${round}|${t}`);
    }
    const groupId = `triple|${section}|${teams.join("-")}|long`;
    const pairs: [number, number][] = [
      [teams[0], teams[1]],
      [teams[0], teams[2]],
      [teams[1], teams[2]],
    ];
    for (const [lo, hi] of pairs) {
      const span = spanAcrossRounds(perRound, section, rounds, lo, hi);
      out.push({
        section,
        roundNumber: Math.min(...rounds),
        kind: "TRIPLE",
        home: teamId(section, lo),
        opponent: teamId(section, hi),
        groupId,
        vpPool: 20,
        boardStart: span.start,
        boardEnd: span.end,
        ruling: tripleRulingHomeRelative(rows, section, lo, hi, span),
      });
    }
  }

  // --- Ordinary TEAMS matches: mutual pairs not in a triple ---
  const emitted = new Set<string>();
  for (const [rkey, byHome] of perRound) {
    const [section, roundStr] = rkey.split("|");
    const round = Number(roundStr);
    for (const [home, opps] of byHome) {
      if (shortTripleTables.has(`${section}|${round}|${home}`)) continue;
      if (longTripleTables.has(`${section}|${round}|${home}`)) continue;
      for (const [opp, rel] of opps) {
        const lo = Math.min(home, opp);
        const hi = Math.max(home, opp);
        const key = `${section}|${round}|${lo}-${hi}`;
        if (emitted.has(key)) continue;
        emitted.add(key);
        const boards = [...rel.boards].sort((a, b) => a - b);
        out.push({
          section,
          roundNumber: round,
          kind: "TEAMS",
          home: teamId(section, lo),
          opponent: teamId(section, hi),
          groupId: null,
          vpPool: 20,
          boardStart: boards[0],
          boardEnd: boards[boards.length - 1],
          // Lift any legacy board-token ruling onto the match row, home-relative
          // (the home room is the lower table; a token on the opponent room is
          // inverted to home-relative).
          ruling: teamsRulingHomeRelative(rows, section, round, lo, hi),
        });
      }
    }
  }

  return out;
}

/**
 * The home-relative match ruling (`VOID:<cause>` / `MM:<side>:<dir>:<fault>`)
 * for the teams match {lo, hi} in a round, lifted from the legacy board tokens
 * the old scenarios stamped. A token on the home (lo) room is used as-is; a
 * token on the opponent (hi) room is inverted (offender/side NS↔EW). Returns
 * null when neither room carries one.
 */
function teamsRulingHomeRelative<R extends TeamMatchRow>(
  rows: R[],
  section: string,
  round: number,
  lo: number,
  hi: number,
): string | null {
  const tokenAt = (table: number): string | null => {
    for (const r of rows) {
      if (r.section !== section || r.roundNumber !== round) continue;
      let home: number;
      try {
        home = parseSeat(r.ns).tableNumber;
      } catch {
        continue;
      }
      if (home !== table) continue;
      if (r.status === "VOID_MATCH" && r.directorOverrideResult != null) {
        return r.directorOverrideResult as string;
      }
      if (r.status === "MISMATCH" && r.matchRuling != null) {
        return r.matchRuling;
      }
    }
    return null;
  };

  const homeToken = tokenAt(lo);
  if (homeToken != null) return homeToken;
  const oppToken = tokenAt(hi);
  if (oppToken != null) return invertTeamsRuling(oppToken);
  return null;
}

/** Invert a teams ruling token's offender/side (NS↔EW) for the opponent room. */
function invertTeamsRuling(token: string): string {
  if (token === "VOID:SHORT_OFFENDER_NS") return "VOID:SHORT_OFFENDER_EW";
  if (token === "VOID:SHORT_OFFENDER_EW") return "VOID:SHORT_OFFENDER_NS";
  const parts = token.split(":");
  if (parts.length === 4 && parts[0] === "MM") {
    parts[1] = parts[1] === "NS" ? "EW" : "NS";
    return parts.join(":");
  }
  return token;
}

/** The board span of the home→opponent relation (either direction) in a round. */
function spanBetween(
  byHome: Map<number, Map<number, { boards: Set<number> }>>,
  lo: number,
  hi: number,
): { start: number; end: number } {
  const boards = new Set<number>();
  for (const [home, opps] of byHome) {
    if (home !== lo && home !== hi) continue;
    const rel = opps.get(home === lo ? hi : lo);
    if (rel) for (const b of rel.boards) boards.add(b);
  }
  const sorted = [...boards].sort((a, b) => a - b);
  return { start: sorted[0] ?? 0, end: sorted[sorted.length - 1] ?? 0 };
}

/** The board span of a long comparison across its rounds. */
function spanAcrossRounds(
  perRound: Map<string, Map<number, Map<number, { boards: Set<number> }>>>,
  section: string,
  rounds: Set<number>,
  lo: number,
  hi: number,
): { start: number; end: number } {
  const boards = new Set<number>();
  for (const round of rounds) {
    const byHome = perRound.get(`${section}|${round}`);
    if (!byHome) continue;
    for (const side of [lo, hi]) {
      const rel = byHome.get(side)?.get(side === lo ? hi : lo);
      if (rel) for (const b of rel.boards) boards.add(b);
    }
  }
  const sorted = [...boards].sort((a, b) => a - b);
  return { start: sorted[0] ?? 0, end: sorted[sorted.length - 1] ?? 0 };
}

/**
 * The home-relative §3.5 mismatch (or void) ruling for ONE triple comparison
 * {lo, hi}, lifted from the board tokens that fall within this comparison's own
 * board span. A triple's home table hosts two separate comparisons on disjoint
 * board sets, so the span is what pins a token to the right comparison. A token
 * on the lower (lo) team's room is home-relative already; one on the higher
 * (hi) team's room is inverted (NS↔EW). Returns null when neither room carries
 * one within the span.
 */
function tripleRulingHomeRelative<R extends TeamMatchRow>(
  rows: R[],
  section: string,
  lo: number,
  hi: number,
  span: { start: number; end: number },
): string | null {
  const tokenAt = (table: number): string | null => {
    for (const r of rows) {
      if (r.section !== section) continue;
      if (r.boardNumber < span.start || r.boardNumber > span.end) continue;
      let home: number;
      try {
        home = parseSeat(r.ns).tableNumber;
      } catch {
        continue;
      }
      if (home !== table) continue;
      if (r.status === "VOID_MATCH" && r.directorOverrideResult != null) {
        return r.directorOverrideResult as string;
      }
      if (r.status === "MISMATCH" && r.matchRuling != null) {
        return r.matchRuling;
      }
    }
    return null;
  };

  const homeToken = tokenAt(lo);
  if (homeToken != null) return homeToken;
  const oppToken = tokenAt(hi);
  if (oppToken != null) return invertTeamsRuling(oppToken);
  return null;
}
