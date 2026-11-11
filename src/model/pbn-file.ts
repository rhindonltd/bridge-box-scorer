import type { Deal } from "./common";
import { parsePbn } from "./deal";

/**
 * Pure PBN (Portable Bridge Notation 2.x) *file* parsing.
 *
 * A PBN file holds zero or more games. For deal import we only care about two
 * tags per game: `Board` (the board number) and `Deal` (the four hands). All
 * other tags, auction/play sections and `{...}` diagrams are skipped. The deal
 * string itself is decoded by {@link parsePbn} in `./deal`.
 *
 * Tolerated import-format quirks (PBN 2.1):
 *  - a UTF-8 BOM and CRLF line endings
 *  - `%` escape lines (e.g. `% PBN 2.1`, `% EXPORT`) and `;` line comments
 *  - `{...}` comments, which may contain blank lines
 *  - several tag pairs on one line, and a tag pair spanning lines
 *  - games separated by blank lines (or, failing that, a repeated Board/Deal)
 *  - a repeated tag within a game: the first occurrence wins
 *  - dealing-program output with no `Board` tag: boards are numbered 1, 2, 3...
 *    in file order
 *
 * No React and no I/O, so it is usable from the browser and the server.
 */

/** One successfully parsed board. */
export interface ParsedPbnBoard {
  boardNumber: number;
  deal: Deal;
}

/** A problem with one game in the file. The rest of the file still parses. */
export interface PbnFileError {
  /** 1-based position of the game among those carrying a Board or Deal tag. */
  gameIndex: number;
  boardNumber?: number;
  message: string;
}

export interface ParsedPbnFile {
  /** Valid boards, in file order. */
  boards: ParsedPbnBoard[];
  errors: PbnFileError[];
}

/** A tag pair: `[Name "value"]`, with whitespace (incl. newlines) allowed between tokens. */
const TAG_PAIR = /\[\s*([A-Za-z0-9_]+)\s*"((?:[^"\\]|\\.)*)"\s*\]/y;

/**
 * Scan the text into games, each a map of tag name to value. Only games that
 * carry a `Board` or `Deal` tag are returned.
 */
function scanGames(text: string): Map<string, string>[] {
  const games: Map<string, string>[] = [];
  let current = new Map<string, string>();

  const flush = () => {
    if (current.size > 0) {
      games.push(current);
      current = new Map();
    }
  };

  const n = text.length;
  let i = 0;
  let atLineStart = true;

  while (i < n) {
    const ch = text[i];

    if (ch === "\n") {
      // A semi-empty line (nothing but spaces/tabs) ends the current game.
      let j = i + 1;
      while (j < n && (text[j] === " " || text[j] === "\t")) j++;
      if (j >= n || text[j] === "\n") flush();
      atLineStart = true;
      i++;
      continue;
    }

    if (ch === "%" && atLineStart) {
      // Escape line: skip to end of line.
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    atLineStart = false;

    if (ch === "{") {
      // Brace comment: runs to the next "}" (no nesting), may span blank lines.
      const end = text.indexOf("}", i + 1);
      i = end === -1 ? n : end + 1;
      continue;
    }

    if (ch === ";") {
      // Line comment (outside a tag string; semicolons inside strings are
      // consumed by the tag matcher below).
      while (i < n && text[i] !== "\n") i++;
      continue;
    }

    if (ch === "[") {
      TAG_PAIR.lastIndex = i;
      const match = TAG_PAIR.exec(text);
      if (match) {
        const name = match[1];
        const value = match[2].replace(/\\(.)/g, "$1");
        // A second Board/Deal means a new game started without a blank line.
        if ((name === "Board" || name === "Deal") && current.has(name)) {
          flush();
        }
        // First occurrence of a tag wins.
        if (!current.has(name)) current.set(name, value);
        i = TAG_PAIR.lastIndex;
        continue;
      }
    }

    i++;
  }
  flush();

  return games.filter((g) => g.has("Board") || g.has("Deal"));
}

/** A positive-integer board number, or null when absent / "?" / not a number. */
function parseBoardNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n > 0 ? n : null;
}

/**
 * Normalise the dealer-prefixed deal string ready for {@link parsePbn}. Some
 * writers mark a void suit with "-" rather than leaving it empty.
 * Returns an error message for a deal with unknown hands, else the string.
 */
function normaliseDeal(value: string): { pbn: string } | { error: string } {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "?") {
    return { error: "No deal given" };
  }

  const colon = trimmed.indexOf(":");
  if (colon <= 0) {
    return { error: "Deal is missing its dealer prefix (e.g. N:...)" };
  }

  const prefix = trimmed.slice(0, colon + 1);
  const hands = trimmed
    .slice(colon + 1)
    .trim()
    .split(/\s+/);

  if (hands.some((h) => h === "-" || h === "?")) {
    return { error: "Deal is incomplete (one or more hands are not given)" };
  }

  const fixed = hands.map((hand) =>
    hand
      .split(".")
      .map((suit) => (suit === "-" ? "" : suit))
      .join("."),
  );
  return { pbn: `${prefix}${fixed.join(" ")}` };
}

/**
 * Parse the text of a PBN file into boards. Never throws: a bad game is
 * reported in `errors` and the remaining games still parse.
 */
export function parsePbnFile(text: string): ParsedPbnFile {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const games = scanGames(cleaned);

  // A file with no usable Board tag at all (typical of dealing-machine output)
  // is numbered 1, 2, 3... in file order.
  const useFileOrder = !games.some(
    (g) => parseBoardNumber(g.get("Board")) !== null,
  );

  const boards: ParsedPbnBoard[] = [];
  const errors: PbnFileError[] = [];
  const seen = new Set<number>();

  games.forEach((game, idx) => {
    const gameIndex = idx + 1;

    const boardNumber = useFileOrder
      ? gameIndex
      : parseBoardNumber(game.get("Board"));
    if (boardNumber === null) {
      const given = game.get("Board");
      errors.push({
        gameIndex,
        message:
          given === undefined
            ? "Game has no Board number"
            : `Invalid board number "${given}"`,
      });
      return;
    }

    const rawDeal = game.get("Deal");
    if (rawDeal === undefined) {
      errors.push({ gameIndex, boardNumber, message: "Game has no Deal" });
      return;
    }

    const normalised = normaliseDeal(rawDeal);
    if ("error" in normalised) {
      errors.push({ gameIndex, boardNumber, message: normalised.error });
      return;
    }

    let deal: Deal;
    try {
      deal = parsePbn(normalised.pbn);
    } catch (err) {
      errors.push({
        gameIndex,
        boardNumber,
        message:
          err instanceof Error ? err.message : "Deal could not be understood",
      });
      return;
    }

    if (seen.has(boardNumber)) {
      errors.push({
        gameIndex,
        boardNumber,
        message: `Board ${boardNumber} appears more than once; the first one was used`,
      });
      return;
    }
    seen.add(boardNumber);

    boards.push({ boardNumber, deal });
  });

  return { boards, errors };
}
