import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectPairsTable from "./SelectPairsTable";
import { vi } from "vitest";

const meta: Meta<typeof SelectPairsTable> = {
  title: "Components/JoinGame/SelectPairsTable",
  component: SelectPairsTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: vi.fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectPairsTable>;

export const Default: Story = {
  args: {
    tables: 8,
    startingPositions: [
      {
        type: "PAIR",
        initialSeat: "4NS",
        player1: {
          id: 1,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
        player2: {
          id: 2,
          firstName: "David",
          lastName: "Collier",
          nationalId: "404476",
        },
      },
      {
        type: "PAIR",
        initialSeat: "6NS",
        player1: {
          id: 3,
          firstName: "Peter",
          lastName: "Collier",
          nationalId: null,
        },
        player2: {
          id: 4,
          firstName: "Nye",
          lastName: "Collier",
          nationalId: "123455",
        },
      },
      {
        type: "PAIR",
        initialSeat: "6EW",
        player1: {
          id: 5,
          firstName: "Andrew",
          lastName: "Robson",
          nationalId: "654321",
        },
        player2: {
          id: 6,
          firstName: "Fred",
          lastName: "Bloggs",
          nationalId: "454353",
        },
      },
    ],
  },
};

export const FewTables: Story = {
  args: {
    tables: 3,
    startingPositions: [],
  },
};

export const ManyTables: Story = {
  args: {
    tables: 16,
    startingPositions: [],
  },
};
