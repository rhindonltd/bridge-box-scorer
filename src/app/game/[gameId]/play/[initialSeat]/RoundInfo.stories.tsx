import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RoundInfo from "@/app/game/[gameId]/play/[initialSeat]/RoundInfo";

const meta: Meta<typeof RoundInfo> = {
  title: "App/Play/Game/Assignment/RoundInfo",
  component: RoundInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof RoundInfo>;

const players = {
  N: {
    id: 1,
    firstName: "Jacqui",
    lastName: "Collier",
    nationalId: "477484",
  },
  S: {
    id: 2,
    firstName: "David",
    lastName: "Collier",
    nationalId: "404476",
  },
  E: {
    id: 3,
    firstName: "Peter",
    lastName: "Collier",
    nationalId: null,
  },
  W: {
    id: 4,
    firstName: "Nye",
    lastName: "Collier",
    nationalId: "123455",
  },
};

export const SingleBoard: Story = {
  args: {
    table: 4,
    boards: [12],
    players,
  },
};

export const ConsecutiveBoards: Story = {
  args: {
    table: 4,
    boards: [12, 13, 14, 15],
    players,
  },
};

export const NonConsecutiveBoards: Story = {
  args: {
    table: 4,
    boards: [2, 5, 8, 11],
    players,
  },
};

export const UnsortedBoards: Story = {
  args: {
    table: 2,
    boards: [15, 12, 14, 13],
    players,
  },
};

export const DifferentTable: Story = {
  args: {
    table: 8,
    boards: [21, 22, 23],
    players: {
      N: {
        id: 101,
        firstName: "Andrew",
        lastName: "Robson",
        nationalId: "654321",
      },
      S: {
        id: 102,
        firstName: "Fred",
        lastName: "Bloggs",
        nationalId: "454353",
      },
      E: {
        id: 103,
        firstName: "Alice",
        lastName: "Smith",
        nationalId: "123456",
      },
      W: {
        id: 104,
        firstName: "Bob",
        lastName: "Jones",
        nationalId: null,
      },
    },
  },
};

// --- Swiss Pairs "2 half matches" rounds -------------------------------------

const opponentOne = {
  E: { id: 5, firstName: "Op", lastName: "One", nationalId: null },
  W: { id: 6, firstName: "Opp", lastName: "One", nationalId: null },
};
const opponentTwo = {
  E: { id: 7, firstName: "Op", lastName: "Two", nationalId: null },
  W: { id: 8, firstName: "Opp", lastName: "Two", nationalId: null },
};

/**
 * The ANCHOR of a half-match round: stays at the table all round and plays two
 * half matches, swapping opponents at the midpoint. Shows both halves + the
 * switch instruction.
 */
export const HalfMatchAnchor: Story = {
  args: {
    table: 1,
    boards: [1, 2, 3, 4],
    players,
    halfMatch: {
      role: "anchor",
      segments: [
        {
          half: "first",
          boards: [1, 2],
          players: { N: players.N, S: players.S, ...opponentOne },
        },
        {
          half: "second",
          boards: [3, 4],
          players: { N: players.N, S: players.S, ...opponentTwo },
        },
      ],
    },
  },
};

/** A non-anchor that plays the FIRST half, then is done for the round. */
export const HalfMatchFirstHalf: Story = {
  args: {
    table: 1,
    boards: [1, 2],
    players,
    halfMatch: {
      role: "firstHalf",
      segments: [
        {
          half: "first",
          boards: [1, 2],
          players: { N: players.N, S: players.S, ...opponentOne },
        },
      ],
    },
  },
};

/** A non-anchor that comes in for the SECOND half. */
export const HalfMatchSecondHalf: Story = {
  args: {
    table: 1,
    boards: [3, 4],
    players,
    halfMatch: {
      role: "secondHalf",
      segments: [
        {
          half: "second",
          boards: [3, 4],
          players: { N: players.N, S: players.S, ...opponentTwo },
        },
      ],
    },
  },
};
