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
        type: "INDIVIDUAL",
        initialSeat: "4N",
        player: {
          id: 1,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        type: "INDIVIDUAL",
        initialSeat: "6N",
        player: {
          id: 2,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        type: "INDIVIDUAL",
        initialSeat: "6S",
        player: {
          id: 3,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        type: "INDIVIDUAL",
        initialSeat: "6E",
        player: {
          id: 4,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        type: "INDIVIDUAL",
        initialSeat: "6W",
        player: {
          id: 5,
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
