import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectTable from "./SelectTable";

const meta: Meta<typeof SelectTable> = {
  title: "Components/JoinGame/SelectTable",
  component: SelectTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  // argTypes: {
  //   selectTable: { action: "table selected" },
  // },
};

export default meta;

type Story = StoryObj<typeof SelectTable>;

export const Default: Story = {
  args: {
    tables: 8,
    startingPositions: [
      {
        tableNumber: 4,
        direction: "N",
        player: {
          id: 1,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
      },
      {
        tableNumber: 6,
        direction: "S",
        player: {
          id: 2,
          firstName: "David",
          lastName: "Collier",
          nationalId: "404476",
        },
      },
      {
        tableNumber: 6,
        direction: "E",
        player: {
          id: 3,
          firstName: "Peter",
          lastName: "Collier",
          nationalId: null,
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
