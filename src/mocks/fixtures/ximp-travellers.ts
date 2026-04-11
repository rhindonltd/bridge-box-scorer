import { Player } from "@/model/participants";
import { PairTraveller } from "@/model/traveller";

export const players: Map<string, Player[]> = new Map([
  [
    "1:1",
    [
      { firstName: "Piers", lastName: "Fuller" },
      { firstName: "Sally", lastName: "Bennett" },
    ],
  ],
  [
    "1:2",
    [
      { firstName: "David", lastName: "Tookey" },
      { firstName: "Peter", lastName: "Verkroost" },
    ],
  ],
  [
    "3:1",
    [
      { firstName: "Peter", lastName: "Clark" },
      { firstName: "Roy", lastName: "Button" },
    ],
  ],
  [
    "3:2",
    [
      { firstName: "Tim", lastName: "Nash" },
      { firstName: "Jeff", lastName: "Green" },
    ],
  ],
  [
    "2:1",
    [
      { firstName: "Bobbie", lastName: "Rodney" },
      { firstName: "Phillip", lastName: "Levy" },
    ],
  ],
  [
    "4:2",
    [
      { firstName: "Rachel", lastName: "Thomas" },
      { firstName: "Srimath", lastName: "Agalawatte" },
    ],
  ],
  [
    "4:1",
    [
      { firstName: "Karima", lastName: "Basse" },
      { firstName: "Helen", lastName: "Robinson" },
    ],
  ],
  [
    "2:2",
    [
      { firstName: "Geoff", lastName: "Horn" },
      { firstName: "Jill", lastName: "Horn" },
    ],
  ],
]);

export const impBoard1 = {
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
