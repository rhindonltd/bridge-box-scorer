export interface PairRound {
  ns: number;
  ew: number;
  boards: number[];
}

export interface Table {
  table: number;
  rounds: PairRound[];
}

export interface MovementTables {
  tables: Table[];
}



export interface Round {
  round: number;
  tables: {
    table: number,
    pair: PairRound
  }[];
}

export interface MovementRounds {
  rounds: Round[];
}
