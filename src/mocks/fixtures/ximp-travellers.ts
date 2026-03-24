import { PairIMPTraveller } from "@/model/traveller";
import { Player } from "@/model/player";

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
  type: "PAIR_IMP",
  board: 1,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "2NTN-1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "2NTN+1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "1NTN=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "2DN-1",
    },
  ],
} as PairIMPTraveller;

export const board2 = {
  type: "PAIR_IMP",
  board: 2,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "2HE+1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "4HW-1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "3HE=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "3HE=",
    },
  ],
} as PairIMPTraveller;

export const board3 = {
  type: "PAIR_IMP",
  board: 3,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "6CN-2",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "5SXE-2",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "6CN-2",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "5CN-1",
    },
  ],
} as PairIMPTraveller;

export const board4 = {
  type: "PAIR_IMP",
  board: 4,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "2SN+2",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "4SS=",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "2SN+2",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "2SN+2",
    },
  ],
} as PairIMPTraveller;

export const board5 = {
  type: "PAIR_IMP",
  board: 5,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "6CW+1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "6CXW=",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "6CW=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "5CW+1",
    },
  ],
} as PairIMPTraveller;

export const board6 = {
  type: "PAIR_IMP",
  board: 6,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "2SW=",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "4SXW-3",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "4HS-3",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "3SW-1",
    },
  ],
} as PairIMPTraveller;

export const board7 = {
  type: "PAIR_IMP",
  board: 7,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "3:2",
      outcome: "3NTS-1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "4:2",
      outcome: "3NTS-1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "1:2",
      outcome: "3NTN+1",
    },
    {
      nsPairId: "4:1",
      ewPairId: "2:2",
      outcome: "3NTS-1",
    },
  ],
} as PairIMPTraveller;

export const board8 = {
  type: "PAIR_IMP",
  board: 8,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "3NTS-2",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "1NTN=",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "2SS-2",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "3DE-1",
    },
  ],
} as PairIMPTraveller;

export const board9 = {
  type: "PAIR_IMP",
  board: 9,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "4HN-2",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "4HE-3",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "1NTW=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "2CE=",
    },
  ],
} as PairIMPTraveller;

export const board10 = {
  type: "PAIR_IMP",
  board: 10,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "2SS+1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "2SS+1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "2SS+2",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "2SS+1",
    },
  ],
} as PairIMPTraveller;

export const board11 = {
  type: "PAIR_IMP",
  board: 11,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "3NTW-3",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "3NTW-2",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "1NTN=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "2HS-2",
    },
  ],
} as PairIMPTraveller;

export const board12 = {
  type: "PAIR_IMP",
  board: 12,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "2HE=",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "1NTN-4",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "1HE=",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "3CN=",
    },
  ],
} as PairIMPTraveller;

export const board13 = {
  type: "PAIR_IMP",
  board: 13,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "5DE+1",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "3NTW+1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "5DW+1",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "4SW-1",
    },
  ],
} as PairIMPTraveller;

export const board14 = {
  type: "PAIR_IMP",
  board: 14,
  section: crypto.randomUUID(),
  lines: [
    {
      nsPairId: "1:1",
      ewPairId: "4:2",
      outcome: "3HE=",
    },
    {
      nsPairId: "2:1",
      ewPairId: "3:2",
      outcome: "4HW-1",
    },
    {
      nsPairId: "3:1",
      ewPairId: "2:2",
      outcome: "4HE-1",
    },
    {
      nsPairId: "4:1",
      ewPairId: "1:2",
      outcome: "3HW=",
    },
  ],
} as PairIMPTraveller;
