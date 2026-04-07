import { Player } from "@/model/participants";
import { PairTraveller } from "@/model/traveller";

export const players: Map<string, Player[]> = new Map([
  [
    "1",
    [
      { firstName: "Steven", lastName: "Leung" },
      { firstName: "Colin", lastName: "Holehouse" },
    ],
  ],
  [
    "2",
    [
      { firstName: "Roy", lastName: "Button" },
      { firstName: "Nadia", lastName: "Button" },
    ],
  ],
  [
    "3",
    [
      { firstName: "Piers", lastName: "Fuller" },
      { firstName: "Sally", lastName: "Bennett" },
    ],
  ],
  [
    "4",
    [
      { firstName: "Srimath", lastName: "Agalawatte" },
      { firstName: "Rachel", lastName: "Thomas" },
    ],
  ],
  [
    "5",
    [
      { firstName: "Bobbie", lastName: "Rodney" },
      { firstName: "Maria", lastName: "Budd" },
    ],
  ],
  [
    "6",
    [
      { firstName: "Jacqui", lastName: "Collier" },
      { firstName: "David", lastName: "Collier" },
    ],
  ],
  [
    "7",
    [
      { firstName: "Geoff", lastName: "Horn" },
      { firstName: "Jill", lastName: "Horn" },
    ],
  ],
  [
    "8",
    [
      { firstName: "Chris", lastName: "Mooney" },
      { firstName: "Jeff", lastName: "Green" },
    ],
  ],
  [
    "9",
    [
      { firstName: "Karima", lastName: "Basse" },
      { firstName: "Helen", lastName: "Robinson" },
    ],
  ],
  [
    "10",
    [
      { firstName: "Peter", lastName: "Clark" },
      { firstName: "John", lastName: "Eyre" },
    ],
  ],
]);

export const mpBoard1 = {
  mode: "PAIR",
  board: 1,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "2",
      outcome: "3NTW+1",
    },
    {
      nsId: "3",
      ewId: "4",
      outcome: "6HE-1",
    },
    {
      nsId: "5",
      ewId: "6",
      outcome: "6CE+1",
    },
    {
      nsId: "7",
      ewId: "8",
      outcome: "3NTW+4",
    },
    {
      nsId: "9",
      ewId: "10",
      outcome: "6CE+1",
    },
  ],
} as PairTraveller;

export const board2 = {
  mode: "PAIR",
  board: 2,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "2",
      outcome: "5HN=",
    },
    {
      nsId: "3",
      ewId: "4",
      outcome: "3CS+3",
    },
    {
      nsId: "5",
      ewId: "6",
      outcome: "5HN=",
    },
    {
      nsId: "7",
      ewId: "8",
      outcome: "5HN=",
    },
    {
      nsId: "9",
      ewId: "10",
      outcome: "5HN=",
    },
  ],
} as PairTraveller;

export const board3 = {
  mode: "PAIR",
  board: 3,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "2",
      outcome: "4HN=",
    },
    {
      nsId: "3",
      ewId: "4",
      outcome: "4CE-5",
    },
    {
      nsId: "5",
      ewId: "6",
      outcome: "4DXW-2",
    },
    {
      nsId: "7",
      ewId: "8",
      outcome: "4HN=",
    },
    {
      nsId: "9",
      ewId: "10",
      outcome: "4HN+1",
    },
  ],
} as PairTraveller;

export const board4 = {
  mode: "PAIR",
  board: 4,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "5",
      outcome: "4HW=",
    },
    {
      nsId: "4",
      ewId: "2",
      outcome: "5DN-1",
    },
    {
      nsId: "7",
      ewId: "3",
      outcome: "4DN-1",
    },
    {
      nsId: "9",
      ewId: "6",
      outcome: "3HW=",
    },
    {
      nsId: "10",
      ewId: "8",
      outcome: "4HW-1",
    },
  ],
} as PairTraveller;

export const board5 = {
  mode: "PAIR",
  board: 5,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "5",
      outcome: "1NTE+3",
    },
    {
      nsId: "4",
      ewId: "2",
      outcome: "1NTW+4",
    },
    {
      nsId: "7",
      ewId: "3",
      outcome: "2NTE+3",
    },
    {
      nsId: "9",
      ewId: "6",
      outcome: "2NTW+3",
    },
    {
      nsId: "10",
      ewId: "8",
      outcome: "1NTE+3",
    },
  ],
} as PairTraveller;

export const board6 = {
  mode: "PAIR",
  board: 6,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "5",
      outcome: "PO",
    },
    {
      nsId: "4",
      ewId: "2",
      outcome: "3HS-1",
    },
    {
      nsId: "7",
      ewId: "3",
      outcome: "2HN+2",
    },
    {
      nsId: "9",
      ewId: "6",
      outcome: "3HS+2",
    },
    {
      nsId: "10",
      ewId: "8",
      outcome: "3HS+1",
    },
  ],
} as PairTraveller;

export const board7 = {
  mode: "PAIR",
  board: 7,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "4",
      ewId: "7",
      outcome: "3DW-2",
    },
    {
      nsId: "5",
      ewId: "2",
      outcome: "3NTW-2",
    },
    {
      nsId: "8",
      ewId: "6",
      outcome: "3CW-1",
    },
    {
      nsId: "9",
      ewId: "1",
      outcome: "2HN-2",
    },
    {
      nsId: "10",
      ewId: "3",
      outcome: "2HN-1",
    },
  ],
} as PairTraveller;

export const board8 = {
  mode: "PAIR",
  board: 8,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "4",
      ewId: "7",
      outcome: "3SW-1",
    },
    {
      nsId: "5",
      ewId: "2",
      outcome: "4HS-1",
    },
    {
      nsId: "8",
      ewId: "6",
      outcome: "4CN=",
    },
    {
      nsId: "9",
      ewId: "1",
      outcome: "4HS-1",
    },
    {
      nsId: "10",
      ewId: "3",
      outcome: "3CN+1",
    },
  ],
} as PairTraveller;

export const board9 = {
  mode: "PAIR",
  board: 9,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "4",
      ewId: "7",
      outcome: "3SE=",
    },
    {
      nsId: "5",
      ewId: "2",
      outcome: "4HE-1",
    },
    {
      nsId: "8",
      ewId: "6",
      outcome: "2DW+1",
    },
    {
      nsId: "9",
      ewId: "1",
      outcome: "4HE-1",
    },
    {
      nsId: "10",
      ewId: "3",
      outcome: "4CS-2",
    },
  ],
} as PairTraveller;

export const board10 = {
  mode: "PAIR",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "5",
      ewId: "9",
      outcome: "2SS-1",
    },
    {
      nsId: "6",
      ewId: "3",
      outcome: "2SS+2",
    },
    {
      nsId: "7",
      ewId: "2",
      outcome: "2CN-1",
    },
    {
      nsId: "8",
      ewId: "1",
      outcome: "2SS+2",
    },
    {
      nsId: "10",
      ewId: "4",
      outcome: "3SS+1",
    },
  ],
} as PairTraveller;

export const board11 = {
  mode: "PAIR",
  board: 11,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "5",
      ewId: "9",
      outcome: "3NTS+2",
    },
    {
      nsId: "6",
      ewId: "3",
      outcome: "3NTS+1",
    },
    {
      nsId: "7",
      ewId: "2",
      outcome: "3NTS+2",
    },
    {
      nsId: "8",
      ewId: "1",
      outcome: "2DN+3",
    },
    {
      nsId: "10",
      ewId: "4",
      outcome: "3NTS+2",
    },
  ],
} as PairTraveller;

export const board12 = {
  mode: "PAIR",
  board: 12,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "5",
      ewId: "9",
      outcome: "4SE+1",
    },
    {
      nsId: "6",
      ewId: "3",
      outcome: "4SE+2",
    },
    {
      nsId: "7",
      ewId: "2",
      outcome: "4SE+2",
    },
    {
      nsId: "8",
      ewId: "1",
      outcome: "6SE=",
    },
    {
      nsId: "10",
      ewId: "4",
      outcome: "4SE+2",
    },
  ],
} as PairTraveller;

export const board13 = {
  mode: "PAIR",
  board: 13,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "3",
      ewId: "1",
      outcome: "3NTW=",
    },
    {
      nsId: "6",
      ewId: "4",
      outcome: "3NTW=",
    },
    {
      nsId: "7",
      ewId: "10",
      outcome: "1NTW+2",
    },
    {
      nsId: "8",
      ewId: "5",
      outcome: "3NTE=",
    },
    {
      nsId: "9",
      ewId: "2",
      outcome: "1NTE+2",
    },
  ],
} as PairTraveller;

export const board14 = {
  mode: "PAIR",
  board: 14,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "3",
      ewId: "1",
      outcome: "6DS-1",
    },
    {
      nsId: "6",
      ewId: "4",
      outcome: "6NTN-1",
    },
    {
      nsId: "7",
      ewId: "10",
      outcome: "5DS+1",
    },
    {
      nsId: "8",
      ewId: "5",
      outcome: "6NTS-1",
    },
    {
      nsId: "9",
      ewId: "2",
      outcome: "3NTN+2",
    },
  ],
} as PairTraveller;

export const board15 = {
  mode: "PAIR",
  board: 15,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "3",
      ewId: "1",
      outcome: "2CN+1",
    },
    {
      nsId: "6",
      ewId: "4",
      outcome: "2HE-3",
    },
    {
      nsId: "7",
      ewId: "10",
      outcome: "2CN=",
    },
    {
      nsId: "8",
      ewId: "5",
      outcome: "2CN+1",
    },
    {
      nsId: "9",
      ewId: "2",
      outcome: "2CN=",
    },
  ],
} as PairTraveller;

export const board16 = {
  mode: "PAIR",
  board: 16,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "4",
      outcome: "3NTW+1",
    },
    {
      nsId: "3",
      ewId: "5",
      outcome: "3NTW+2",
    },
    {
      nsId: "6",
      ewId: "7",
      outcome: "3NTW+1",
    },
    {
      nsId: "9",
      ewId: "8",
      outcome: "3NTW+1",
    },
    {
      nsId: "10",
      ewId: "2",
      outcome: "3NTW+2",
    },
  ],
} as PairTraveller;

export const board17 = {
  mode: "PAIR",
  board: 17,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "4",
      outcome: "3HS+2",
    },
    {
      nsId: "3",
      ewId: "5",
      outcome: "2HS=",
    },
    {
      nsId: "6",
      ewId: "7",
      outcome: "1NTS+1",
    },
    {
      nsId: "9",
      ewId: "8",
      outcome: "1NTS+3",
    },
    {
      nsId: "10",
      ewId: "2",
      outcome: "2HS=",
    },
  ],
} as PairTraveller;

export const board18 = {
  mode: "PAIR",
  board: 18,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "4",
      outcome: "1NTN+1",
    },
    {
      nsId: "3",
      ewId: "5",
      outcome: "3HW-2",
    },
    {
      nsId: "6",
      ewId: "7",
      outcome: "3DS=",
    },
    {
      nsId: "9",
      ewId: "8",
      outcome: "2SW=",
    },
    {
      nsId: "10",
      ewId: "2",
      outcome: "1NTN+1",
    },
  ],
} as PairTraveller;

export const board19 = {
  mode: "PAIR",
  board: 19,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "7",
      outcome: "5CXS-1",
    },
    {
      nsId: "3",
      ewId: "9",
      outcome: "5CXS-1",
    },
    {
      nsId: "4",
      ewId: "5",
      outcome: "3SW=",
    },
    {
      nsId: "8",
      ewId: "2",
      outcome: "5CXS-2",
    },
    {
      nsId: "10",
      ewId: "6",
      outcome: "5CXS-2",
    },
  ],
} as PairTraveller;

export const board20 = {
  mode: "PAIR",
  board: 20,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "7",
      outcome: "3SE-1",
    },
    {
      nsId: "3",
      ewId: "9",
      outcome: "2SE=",
    },
    {
      nsId: "4",
      ewId: "5",
      outcome: "3SE-1",
    },
    {
      nsId: "8",
      ewId: "2",
      outcome: "2HN=",
    },
    {
      nsId: "10",
      ewId: "6",
      outcome: "3HN-1",
    },
  ],
} as PairTraveller;

export const board21 = {
  mode: "PAIR",
  board: 21,
  section: crypto.randomUUID(),
  lines: [
    {
      nsId: "1",
      ewId: "7",
      outcome: "4SN-1",
    },
    {
      nsId: "3",
      ewId: "9",
      outcome: "4SN=",
    },
    {
      nsId: "4",
      ewId: "5",
      outcome: "6SXN-3",
    },
    {
      nsId: "8",
      ewId: "2",
      outcome: "6SN-2",
    },
    {
      nsId: "10",
      ewId: "6",
      outcome: "4SN=",
    },
  ],
} as PairTraveller;
