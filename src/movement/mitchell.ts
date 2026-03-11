type MovementType = "mitchell" | "skip" | "arrow" | "double" | "rover";

export interface MovementSpec {
  tables: number;
  rounds: number;
  boardsPerRound: number;
  type?: MovementType;
  arrowSwitchRounds?: number;
}

export interface PairRound {
  ns: number;
  ew: number;
  boards: number[];
}

export interface Table {
  table: number;
  rounds: PairRound[];
}

export function generateMovement(spec: MovementSpec): Table[] {
  const {
    tables,
    rounds,
    boardsPerRound,
    type = "mitchell",
    arrowSwitchRounds = 0,
  } = spec;

  const skipAfter = Math.floor(tables / 2);

  const result: Table[] = [];

  for (let t = 1; t <= tables; t++) {
    const roundsList: PairRound[] = [];

    for (let r = 0; r < rounds; r++) {
      let distance = r;

      if (type === "skip" && r >= skipAfter) distance++;
      if (type === "double") distance = r * 2;

      let ns = t;
      let ew = wrap(t - distance, tables);

      if (type === "rover" && t === tables) {
        ew = wrap(ew + r, tables);
      }

      const boardSet = wrap(t + r, tables);

      if (type === "arrow" && r >= rounds - arrowSwitchRounds) {
        [ns, ew] = [ew, ns];
      }

      roundsList.push({
        ns,
        ew,
        boards: boardsForSet(boardSet, boardsPerRound),
      });
    }

    result.push({
      table: t,
      rounds: roundsList,
    });
  }

  return result;
}

function wrap(v: number, m: number) {
  return ((v - 1 + m * 1000) % m) + 1;
}

function boardsForSet(set: number, perRound: number) {
  const start = (set - 1) * perRound + 1;
  return Array.from({ length: perRound }, (_, i) => start + i);
}
