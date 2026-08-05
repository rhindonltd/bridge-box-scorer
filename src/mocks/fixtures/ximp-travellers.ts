import { Player } from "@/db/game/tables/players";
import { PairTraveller } from "@/model/traveller";

export const players: Map<string, Player[]> = new Map([
  [
    "1:1",
    [
      { id: 1, firstName: "Piers", lastName: "Fuller", nationalId: null },
      { id: 2, firstName: "Sally", lastName: "Bennett", nationalId: null },
    ],
  ],
  [
    "1:2",
    [
      { id: 3, firstName: "David", lastName: "Tookey", nationalId: null },
      { id: 4, firstName: "Peter", lastName: "Verkroost", nationalId: null },
    ],
  ],
  [
    "3:1",
    [
      { id: 5, firstName: "Peter", lastName: "Clark", nationalId: null },
      { id: 6, firstName: "Roy", lastName: "Button", nationalId: null },
    ],
  ],
  [
    "3:2",
    [
      { id: 7, firstName: "Tim", lastName: "Nash", nationalId: null },
      { id: 8, firstName: "Jeff", lastName: "Green", nationalId: null },
    ],
  ],
  [
    "2:1",
    [
      { id: 9, firstName: "Bobbie", lastName: "Rodney", nationalId: null },
      { id: 10, firstName: "Phillip", lastName: "Levy", nationalId: null },
    ],
  ],
  [
    "4:2",
    [
      { id: 11, firstName: "Rachel", lastName: "Thomas", nationalId: null },
      {
        id: 12,
        firstName: "Srimath",
        lastName: "Agalawatte",
        nationalId: null,
      },
    ],
  ],
  [
    "4:1",
    [
      { id: 13, firstName: "Karima", lastName: "Basse", nationalId: null },
      { id: 14, firstName: "Helen", lastName: "Robinson", nationalId: null },
    ],
  ],
  [
    "2:2",
    [
      { id: 15, firstName: "Geoff", lastName: "Horn", nationalId: null },
      { id: 16, firstName: "Jill", lastName: "Horn", nationalId: null },
    ],
  ],
]);

export const impBoard1 = {
  type: "PAIR",
  mode: "PAIR",
  board: 1,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "2NTN-1",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "2NTN+1",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "1NTN=",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "2DN-1",
    },
  ],
} as PairTraveller;

export const board2 = {
  mode: "PAIR",
  board: 2,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "2HE+1",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "4HW-1",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "3HE=",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "3HE=",
    },
  ],
} as PairTraveller;

export const board3 = {
  mode: "PAIR",
  board: 3,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "6CN-2",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "5SXE-2",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "6CN-2",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "5CN-1",
    },
  ],
} as PairTraveller;

export const board4 = {
  mode: "PAIR",
  board: 4,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "2SN+2",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "4SS=",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "2SN+2",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "2SN+2",
    },
  ],
} as PairTraveller;

export const board5 = {
  mode: "PAIR",
  board: 5,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "6CW+1",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "6CXW=",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "6CW=",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "5CW+1",
    },
  ],
} as PairTraveller;

export const board6 = {
  mode: "PAIR",
  board: 6,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "2SW=",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "4SXW-3",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "4HS-3",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "3SW-1",
    },
  ],
} as PairTraveller;

export const board7 = {
  mode: "PAIR",
  board: 7,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "3:2",
      outcome: "3NTS-1",
    },
    {
      nsId: "2:1",
      ewId: "4:2",
      outcome: "3NTS-1",
    },
    {
      nsId: "3:1",
      ewId: "1:2",
      outcome: "3NTN+1",
    },
    {
      nsId: "4:1",
      ewId: "2:2",
      outcome: "3NTS-1",
    },
  ],
} as PairTraveller;

export const board8 = {
  mode: "PAIR",
  board: 8,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "3NTS-2",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "1NTN=",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "2SS-2",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "3DE-1",
    },
  ],
} as PairTraveller;

export const board9 = {
  mode: "PAIR",
  board: 9,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "4HN-2",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "4HE-3",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "1NTW=",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "2CE=",
    },
  ],
} as PairTraveller;

export const board10 = {
  mode: "PAIR",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "2SS+1",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "2SS+1",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "2SS+2",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "2SS+1",
    },
  ],
} as PairTraveller;

export const board11 = {
  mode: "PAIR",
  board: 11,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "3NTW-3",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "3NTW-2",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "1NTN=",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "2HS-2",
    },
  ],
} as PairTraveller;

export const board12 = {
  mode: "PAIR",
  board: 12,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "2HE=",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "1NTN-4",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "1HE=",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "3CN=",
    },
  ],
} as PairTraveller;

export const board13 = {
  mode: "PAIR",
  board: 13,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "5DE+1",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "3NTW+1",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "5DW+1",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "4SW-1",
    },
  ],
} as PairTraveller;

export const board14 = {
  mode: "PAIR",
  board: 14,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1:1",
      ewId: "4:2",
      outcome: "3HE=",
    },
    {
      nsId: "2:1",
      ewId: "3:2",
      outcome: "4HW-1",
    },
    {
      nsId: "3:1",
      ewId: "2:2",
      outcome: "4HE-1",
    },
    {
      nsId: "4:1",
      ewId: "1:2",
      outcome: "3HW=",
    },
  ],
} as PairTraveller;
