import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Read the score tables the app renders (leaderboards, travellers, the team
 * result view). Every scoring screen draws a real `<table>` through one shared
 * component, so a single reader covers all of them without per-screen testids.
 */
export interface ScoreTableData {
  /** Column header labels, in order. */
  headers: string[];
  /** One entry per body row; each is that row's cell texts in column order. */
  rows: string[][];
}

/** Read every `<table>` under `scope` (a page or a locator). */
export async function readScoreTables(
  scope: Page | Locator,
): Promise<ScoreTableData[]> {
  return scope.locator("table").evaluateAll((tables) =>
    tables.map((table) => {
      const text = (el: Element) =>
        (el as HTMLElement).innerText.replace(/\s+/g, " ").trim();
      return {
        headers: Array.from(table.querySelectorAll("thead th")).map(text),
        rows: Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
          Array.from(tr.querySelectorAll("td")).map(text),
        ),
      };
    }),
  );
}

/** The first table that has a column with this header (throws if none). */
export function tableWithHeader(
  tables: ScoreTableData[],
  header: string,
): ScoreTableData {
  const found = tables.find((t) => t.headers.includes(header));
  if (!found) {
    throw new Error(
      `No table with a "${header}" column; saw: ${tables
        .map((t) => `[${t.headers.join(" | ")}]`)
        .join(" ")}`,
    );
  }
  return found;
}

/** One column of a table, by header label. */
export function column(table: ScoreTableData, header: string): string[] {
  const index = table.headers.indexOf(header);
  if (index < 0) {
    throw new Error(`No "${header}" column in [${table.headers.join(" | ")}]`);
  }
  return table.rows.map((row) => row[index] ?? "");
}

/**
 * Parse a displayed score: tolerates a leading "+", the typographic minus, a
 * trailing "%", and the "½" glyph (e.g. "3½" or "½").
 */
export function parseScore(text: string): number {
  const cleaned = text.replace(/[−–]/g, "-").replace(/[+%\s]/g, "");
  if (cleaned === "") return NaN;
  const half = cleaned.includes("½");
  const base = cleaned.replace("½", "");
  const sign = base.startsWith("-") ? -1 : 1;
  const whole = base.replace("-", "");
  const value = (whole === "" ? 0 : Number(whole)) + (half ? 0.5 : 0);
  return sign * value;
}

/**
 * Map a leaderboard's team (or pair) name to a numeric cell, so a test can say
 * `scores["Team A1NS"]` whatever the row order. Pass the header of the name
 * column and of the value column.
 */
export function scoresByName(
  table: ScoreTableData,
  nameHeader: string,
  valueHeader: string,
): Record<string, number> {
  const names = column(table, nameHeader);
  const values = column(table, valueHeader);
  return Object.fromEntries(names.map((n, i) => [n, parseScore(values[i])]));
}

/**
 * Check a leaderboard is ranked consistently with its own figures, whatever the
 * results: sorted best first, ranks start at 1 and never go backwards, a worse
 * figure never shares or beats a better one's rank, and equal figures show the
 * same rank. (It works from the displayed, rounded figures, so it only demands
 * "same figure => same rank number" and "lower figure => larger rank number".)
 */
export function expectRankingConsistent(
  table: ScoreTableData,
  valueHeader: string,
): void {
  const ranks = column(table, "RANK");
  const values = column(table, valueHeader).map(parseScore);
  const numbers = ranks.map((r) => Number(r.replace("=", "")));
  expect(numbers[0]).toBe(1);
  for (let i = 1; i < values.length; i++) {
    expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i - 1]);
    if (values[i] < values[i - 1]) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
    if (values[i] === values[i - 1]) {
      expect(numbers[i]).toBe(numbers[i - 1]);
      // A tie is flagged with "=" on both rows.
      expect(ranks[i]).toContain("=");
      expect(ranks[i - 1]).toContain("=");
    }
  }
}

/** The mean of a list of numbers. */
export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
