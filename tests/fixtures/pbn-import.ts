/**
 * A PBN file as a dealing machine would write it, for the given board numbers.
 *
 * Every board carries the same legal 52-card deal (the example game from the
 * PBN 2.1 specification), which is enough to prove the import path end to end.
 * The file includes the things real files have and the importer must ignore:
 * a `%` header, other tags, a diagram comment with a blank line in it, and an
 * auction section.
 */
const SPEC_DEAL =
  "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85";

export function buildPbnFile(boards: number[]): string {
  const games = boards.map(
    (board) => `[Event "Journey import"]
[Board "${board}"]
[Dealer "N"]
[Vulnerable "None"]
[Deal "${SPEC_DEAL}"]
{
Diagram

with a blank line
}
[Auction "N"]
1D Pass Pass Pass
`,
  );
  return `% PBN 2.1\n% EXPORT\n\n${games.join("\n")}`;
}
