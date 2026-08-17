import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RoundInfo from "./RoundInfo";

const meta: Meta<typeof RoundInfo> = {
  title: "Components/Play/RoundInfo",
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
