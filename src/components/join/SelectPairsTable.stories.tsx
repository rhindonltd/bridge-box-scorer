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
    setStartingPosition: vi.fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectPairsTable>;

export const Default: Story = {
  args: {
    tables: 8,
    startingPositions: [
      {
        tableNumber: 4,
        direction: "NS",
        pair: {
          player1: {
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: "477484",
          },
          player2: {
            firstName: "David",
            lastName: "Collier",
            nationalId: "404476",
          },
        },
      },
      {
        tableNumber: 6,
        direction: "NS",
        pair: {
          player1: {
            firstName: "Peter",
            lastName: "Collier",
            nationalId: null,
          },
          player2: {
            firstName: "Nye",
            lastName: "Collier",
            nationalId: "123455",
          },
        },
      },
      {
        tableNumber: 6,
        direction: "EW",
        pair: {
          player1: {
            firstName: "Andrew",
            lastName: "Robson",
            nationalId: "654321",
          },
          player2: {
            firstName: "Fred",
            lastName: "Bloggs",
            nationalId: "454353",
          },
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
