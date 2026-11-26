import * as fs from "fs";
import * as path from "path";
import { groupLinesReducer } from "@/modules/movement-catalog/shared";

/**
 * Read a movement file (PSMovements.txt) and split it into
 * blank-line-separated groups of lines, one group per movement.
 *
 * The files sit next to this module, so they are found relative to
 * `__dirname`: this folder under `tsx`, and `dist/` in the bundled
 * `dist/sync-movements.js` (scripts/build-sync-movements.mjs copies them there).
 */
export const splitLinesOfFile = (fileName: string): string[][] => {
  const content = fs.readFileSync(path.join(__dirname, fileName), "utf-8");

  return content
    .split(/\r?\n/)
    .reduce<string[][]>(groupLinesReducer, [[]])
    .filter((group) => group.length > 0);
};
