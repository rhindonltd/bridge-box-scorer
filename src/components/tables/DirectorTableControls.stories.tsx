import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import DirectorTableControls from "./DirectorTableControls";
import { fn } from "storybook/test";

const meta: Meta<typeof DirectorTableControls> = {
  title: "Components/Tables/DirectorTableControls",
  component: DirectorTableControls,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onEvict: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof DirectorTableControls>;

const yoshiPlayers = {
  N: { id: 1, firstName: "Yellow", lastName: "Yoshi", nationalId: null },
  S: { id: 1, firstName: "Blue", lastName: "Yoshi", nationalId: null },
  E: { id: 1, firstName: "Green", lastName: "Yoshi", nationalId: null },
  W: { id: 1, firstName: "Purple", lastName: "Yoshi", nationalId: null },
};

const emptySeats = { N: null, S: null, E: null, W: null };

export const Default: Story = {
  args: {
    tables: [
      { tableNumber: 1, players: yoshiPlayers, seats: emptySeats },
      { tableNumber: 2, players: yoshiPlayers, seats: emptySeats },
    ],
  },
};

/**
 * Standard Mitchell: each table shows the boards it starts with, no copy and
 * no share/relay.
 */
export const WithBoardPlacement: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 1, boardEnd: 3 },
      },
      {
        tableNumber: 2,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 4, boardEnd: 6 },
      },
    ],
  },
};

/**
 * Web Mitchell: the same board set runs on two physical copies (A and B), so
 * each table's placement names its copy.
 */
export const WithBoardCopies: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 1, boardEnd: 3, boardCopy: "A" },
      },
      {
        tableNumber: 2,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 1, boardEnd: 3, boardCopy: "B" },
      },
    ],
  },
};

/**
 * Share-and-Relay: the first and last tables share a board set, and a relay
 * sits between the two middle tables.
 */
export const WithShareAndRelay: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 1, boardEnd: 2, sharesWith: [4] },
      },
      {
        tableNumber: 2,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 3, boardEnd: 4, relayWith: 3 },
      },
      {
        tableNumber: 3,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 7, boardEnd: 8, relayWith: 2 },
      },
      {
        tableNumber: 4,
        players: yoshiPlayers,
        seats: emptySeats,
        placement: { boardStart: 1, boardEnd: 2, sharesWith: [1] },
      },
    ],
  },
};
