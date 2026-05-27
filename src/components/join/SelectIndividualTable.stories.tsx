import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectIndividualTable from "./SelectIndividualTable";
import { vi } from "vitest";

const meta: Meta<typeof SelectIndividualTable> = {
  title: "Components/JoinGame/SelectIndividualTable",
  component: SelectIndividualTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: vi.fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectIndividualTable>;

export const Default: Story = {
  args: {
    tables: 8,
    startingPositions: [
      {
        tableNumber: 4,
        direction: "N",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        tableNumber: 6,
        direction: "N",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        tableNumber: 6,
        direction: "S",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        tableNumber: 6,
        direction: "E",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        tableNumber: 6,
        direction: "W",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
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
