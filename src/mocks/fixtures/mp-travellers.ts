import { PairMPTraveller } from "@/model/traveller";
import { Player } from "@/model/player";

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

export const board1 = {
  type: "PAIR_MP",
  board: 1,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "2",
      outcome: "3NTW+1",
    },
    {
      nsPairId: "3",
      ewPairId: "4",
      outcome: "6HE-1",
    },
    {
      nsPairId: "5",
      ewPairId: "6",
      outcome: "6CE+1",
    },
    {
      nsPairId: "7",
      ewPairId: "8",
      outcome: "3NTW+4",
    },
    {
      nsPairId: "9",
      ewPairId: "10",
      outcome: "6CE+1",
    },
  ],
} as PairMPTraveller;

export const board2 = {
  type: "PAIR_MP",
  board: 2,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "2",
      outcome: "5HN=",
    },
    {
      nsPairId: "3",
      ewPairId: "4",
      outcome: "3CS+3",
    },
    {
      nsPairId: "5",
      ewPairId: "6",
      outcome: "5HN=",
    },
    {
      nsPairId: "7",
      ewPairId: "8",
      outcome: "5HN=",
    },
    {
      nsPairId: "9",
      ewPairId: "10",
      outcome: "5HN=",
    },
  ],
} as PairMPTraveller;

export const board3 = {
  type: "PAIR_MP",
  board: 3,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "2",
      outcome: "4HN=",
    },
    {
      nsPairId: "3",
      ewPairId: "4",
      outcome: "4CE-5",
    },
    {
      nsPairId: "5",
      ewPairId: "6",
      outcome: "4DXW-2",
    },
    {
      nsPairId: "7",
      ewPairId: "8",
      outcome: "4HN=",
    },
    {
      nsPairId: "9",
      ewPairId: "10",
      outcome: "4HN+1",
    },
  ],
} as PairMPTraveller;

export const board4 = {
  type: "PAIR_MP",
  board: 4,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "5",
      outcome: "4HW=",
    },
    {
      nsPairId: "4",
      ewPairId: "2",
      outcome: "5DN-1",
    },
    {
      nsPairId: "7",
      ewPairId: "3",
      outcome: "4DN-1",
    },
    {
      nsPairId: "9",
      ewPairId: "6",
      outcome: "3HW=",
    },
    {
      nsPairId: "10",
      ewPairId: "8",
      outcome: "4HW-1",
    },
  ],
} as PairMPTraveller;

export const board5 = {
  type: "PAIR_MP",
  board: 5,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "5",
      outcome: "1NTE+3",
    },
    {
      nsPairId: "4",
      ewPairId: "2",
      outcome: "1NTW+4",
    },
    {
      nsPairId: "7",
      ewPairId: "3",
      outcome: "2NTE+3",
    },
    {
      nsPairId: "9",
      ewPairId: "6",
      outcome: "2NTW+3",
    },
    {
      nsPairId: "10",
      ewPairId: "8",
      outcome: "1NTE+3",
    },
  ],
} as PairMPTraveller;

export const board6 = {
  type: "PAIR_MP",
  board: 6,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "5",
      outcome: "PO",
    },
    {
      nsPairId: "4",
      ewPairId: "2",
      outcome: "3HS-1",
    },
    {
      nsPairId: "7",
      ewPairId: "3",
      outcome: "2HN+2",
    },
    {
      nsPairId: "9",
      ewPairId: "6",
      outcome: "3HS+2",
    },
    {
      nsPairId: "10",
      ewPairId: "8",
      outcome: "3HS+1",
    },
  ],
} as PairMPTraveller;

export const board7 = {
  type: "PAIR_MP",
  board: 7,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "4",
      ewPairId: "7",
      outcome: "3DW-2",
    },
    {
      nsPairId: "5",
      ewPairId: "2",
      outcome: "3NTW-2",
    },
    {
      nsPairId: "8",
      ewPairId: "6",
      outcome: "3CW-1",
    },
    {
      nsPairId: "9",
      ewPairId: "1",
      outcome: "2HN-2",
    },
    {
      nsPairId: "10",
      ewPairId: "3",
      outcome: "2HN-1",
    },
  ],
} as PairMPTraveller;

export const board8 = {
  type: "PAIR_MP",
  board: 8,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "4",
      ewPairId: "7",
      outcome: "3SW-1",
    },
    {
      nsPairId: "5",
      ewPairId: "2",
      outcome: "4HS-1",
    },
    {
      nsPairId: "8",
      ewPairId: "6",
      outcome: "4CN=",
    },
    {
      nsPairId: "9",
      ewPairId: "1",
      outcome: "4HS-1",
    },
    {
      nsPairId: "10",
      ewPairId: "3",
      outcome: "3CN+1",
    },
  ],
} as PairMPTraveller;

export const board9 = {
  type: "PAIR_MP",
  board: 9,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "4",
      ewPairId: "7",
      outcome: "3SE=",
    },
    {
      nsPairId: "5",
      ewPairId: "2",
      outcome: "4HE-1",
    },
    {
      nsPairId: "8",
      ewPairId: "6",
      outcome: "2DW+1",
    },
    {
      nsPairId: "9",
      ewPairId: "1",
      outcome: "4HE-1",
    },
    {
      nsPairId: "10",
      ewPairId: "3",
      outcome: "4CS-2",
    },
  ],
} as PairMPTraveller;

export const board10 = {
  type: "PAIR_MP",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "5",
      ewPairId: "9",
      outcome: "2SS-1",
    },
    {
      nsPairId: "6",
      ewPairId: "3",
      outcome: "2SS+2",
    },
    {
      nsPairId: "7",
      ewPairId: "2",
      outcome: "2CN-1",
    },
    {
      nsPairId: "8",
      ewPairId: "1",
      outcome: "2SS+2",
    },
    {
      nsPairId: "10",
      ewPairId: "4",
      outcome: "3SS+1",
    },
  ],
} as PairMPTraveller;

export const board11 = {
  type: "PAIR_MP",
  board: 11,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "5",
      ewPairId: "9",
      outcome: "3NTS+2",
    },
    {
      nsPairId: "6",
      ewPairId: "3",
      outcome: "3NTS+1",
    },
    {
      nsPairId: "7",
      ewPairId: "2",
      outcome: "3NTS+2",
    },
    {
      nsPairId: "8",
      ewPairId: "1",
      outcome: "2DN+3",
    },
    {
      nsPairId: "10",
      ewPairId: "4",
      outcome: "3NTS+2",
    },
  ],
} as PairMPTraveller;

export const board12 = {
  type: "PAIR_MP",
  board: 12,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "5",
      ewPairId: "9",
      outcome: "4SE+1",
    },
    {
      nsPairId: "6",
      ewPairId: "3",
      outcome: "4SE+2",
    },
    {
      nsPairId: "7",
      ewPairId: "2",
      outcome: "4SE+2",
    },
    {
      nsPairId: "8",
      ewPairId: "1",
      outcome: "6SE=",
    },
    {
      nsPairId: "10",
      ewPairId: "4",
      outcome: "4SE+2",
    },
  ],
} as PairMPTraveller;

export const board13 = {
  type: "PAIR_MP",
  board: 13,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "3",
      ewPairId: "1",
      outcome: "3NTW=",
    },
    {
      nsPairId: "6",
      ewPairId: "4",
      outcome: "3NTW=",
    },
    {
      nsPairId: "7",
      ewPairId: "10",
      outcome: "1NTW+2",
    },
    {
      nsPairId: "8",
      ewPairId: "5",
      outcome: "3NTE=",
    },
    {
      nsPairId: "9",
      ewPairId: "2",
      outcome: "1NTE+2",
    },
  ],
} as PairMPTraveller;

export const board14 = {
  type: "PAIR_MP",
  board: 14,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "3",
      ewPairId: "1",
      outcome: "6DS-1",
    },
    {
      nsPairId: "6",
      ewPairId: "4",
      outcome: "6NTN-1",
    },
    {
      nsPairId: "7",
      ewPairId: "10",
      outcome: "5DS+1",
    },
    {
      nsPairId: "8",
      ewPairId: "5",
      outcome: "6NTS-1",
    },
    {
      nsPairId: "9",
      ewPairId: "2",
      outcome: "3NTN+2",
    },
  ],
} as PairMPTraveller;

export const board15 = {
  type: "PAIR_MP",
  board: 15,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "3",
      ewPairId: "1",
      outcome: "2CN+1",
    },
    {
      nsPairId: "6",
      ewPairId: "4",
      outcome: "2HE-3",
    },
    {
      nsPairId: "7",
      ewPairId: "10",
      outcome: "2CN=",
    },
    {
      nsPairId: "8",
      ewPairId: "5",
      outcome: "2CN+1",
    },
    {
      nsPairId: "9",
      ewPairId: "2",
      outcome: "2CN=",
    },
  ],
} as PairMPTraveller;

export const board16 = {
  type: "PAIR_MP",
  board: 16,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "4",
      outcome: "3NTW+1",
    },
    {
      nsPairId: "3",
      ewPairId: "5",
      outcome: "3NTW+2",
    },
    {
      nsPairId: "6",
      ewPairId: "7",
      outcome: "3NTW+1",
    },
    {
      nsPairId: "9",
      ewPairId: "8",
      outcome: "3NTW+1",
    },
    {
      nsPairId: "10",
      ewPairId: "2",
      outcome: "3NTW+2",
    },
  ],
} as PairMPTraveller;

export const board17 = {
  type: "PAIR_MP",
  board: 17,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "4",
      outcome: "3HS+2",
    },
    {
      nsPairId: "3",
      ewPairId: "5",
      outcome: "2HS=",
    },
    {
      nsPairId: "6",
      ewPairId: "7",
      outcome: "1NTS+1",
    },
    {
      nsPairId: "9",
      ewPairId: "8",
      outcome: "1NTS+3",
    },
    {
      nsPairId: "10",
      ewPairId: "2",
      outcome: "2HS=",
    },
  ],
} as PairMPTraveller;

export const board18 = {
  type: "PAIR_MP",
  board: 18,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "4",
      outcome: "1NTN+1",
    },
    {
      nsPairId: "3",
      ewPairId: "5",
      outcome: "3HW-2",
    },
    {
      nsPairId: "6",
      ewPairId: "7",
      outcome: "3DS=",
    },
    {
      nsPairId: "9",
      ewPairId: "8",
      outcome: "2SW=",
    },
    {
      nsPairId: "10",
      ewPairId: "2",
      outcome: "1NTN+1",
    },
  ],
} as PairMPTraveller;

export const board19 = {
  type: "PAIR_MP",
  board: 19,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "7",
      outcome: "5CXS-1",
    },
    {
      nsPairId: "3",
      ewPairId: "9",
      outcome: "5CXS-1",
    },
    {
      nsPairId: "4",
      ewPairId: "5",
      outcome: "3SW=",
    },
    {
      nsPairId: "8",
      ewPairId: "2",
      outcome: "5CXS-2",
    },
    {
      nsPairId: "10",
      ewPairId: "6",
      outcome: "5CXS-2",
    },
  ],
} as PairMPTraveller;

export const board20 = {
  type: "PAIR_MP",
  board: 20,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "7",
      outcome: "3SE-1",
    },
    {
      nsPairId: "3",
      ewPairId: "9",
      outcome: "2SE=",
    },
    {
      nsPairId: "4",
      ewPairId: "5",
      outcome: "3SE-1",
    },
    {
      nsPairId: "8",
      ewPairId: "2",
      outcome: "2HN=",
    },
    {
      nsPairId: "10",
      ewPairId: "6",
      outcome: "3HN-1",
    },
  ],
} as PairMPTraveller;

export const board21 = {
  type: "PAIR_MP",
  board: 21,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1",
      ewPairId: "7",
      outcome: "4SN-1",
    },
    {
      nsPairId: "3",
      ewPairId: "9",
      outcome: "4SN=",
    },
    {
      nsPairId: "4",
      ewPairId: "5",
      outcome: "6SXN-3",
    },
    {
      nsPairId: "8",
      ewPairId: "2",
      outcome: "6SN-2",
    },
    {
      nsPairId: "10",
      ewPairId: "6",
      outcome: "4SN=",
    },
  ],
} as PairMPTraveller;
