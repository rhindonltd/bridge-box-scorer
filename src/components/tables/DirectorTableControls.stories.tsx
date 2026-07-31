import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import DirectorTableControls from "./DirectorTableControls";

const meta: Meta<typeof DirectorTableControls> = {
  title: "Components/Tables/DirectorTableControls",
  component: DirectorTableControls,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAddTable: fn(),
    onRemoveTable: fn(),
    onEvict: fn(),
    canRemoveTable: true,
  },
};

export default meta;

type Story = StoryObj<typeof DirectorTableControls>;

export const Default: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: {
          N: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: "123456" },
          S: { id: 2, firstName: "Bob", lastName: "Jones", nationalId: null },
          E: null,
          W: null,
        },
        seats: {
          N: "1NS",
          S: "1NS",
          E: null,
          W: null,
        },
      },
      {
        tableNumber: 2,
        players: {
          N: null,
          S: null,
          E: null,
          W: null,
        },
        seats: {
          N: null,
          S: null,
          E: null,
          W: null,
        },
      },
    ],
  },
};

export const FullTables: Story = {
  args: {
    canRemoveTable: false,
    tables: [
      {
        tableNumber: 1,
        players: {
          N: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: "123456" },
          S: { id: 2, firstName: "Bob", lastName: "Jones", nationalId: null },
          E: { id: 3, firstName: "Carol", lastName: "Williams", nationalId: "654321" },
          W: { id: 4, firstName: "David", lastName: "Brown", nationalId: null },
        },
        seats: {
          N: "1NS",
          S: "1NS",
          E: "1EW",
          W: "1EW",
        },
      },
      {
        tableNumber: 2,
        players: {
          N: { id: 5, firstName: "Eve", lastName: "Davis", nationalId: null },
          S: { id: 6, firstName: "Frank", lastName: "Miller", nationalId: null },
          E: { id: 7, firstName: "Grace", lastName: "Wilson", nationalId: null },
          W: { id: 8, firstName: "Henry", lastName: "Taylor", nationalId: null },
        },
        seats: {
          N: "2NS",
          S: "2NS",
          E: "2EW",
          W: "2EW",
        },
      },
    ],
  },
};

export const EmptyTables: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: { N: null, S: null, E: null, W: null },
        seats: { N: null, S: null, E: null, W: null },
      },
      {
        tableNumber: 2,
        players: { N: null, S: null, E: null, W: null },
        seats: { N: null, S: null, E: null, W: null },
      },
      {
        tableNumber: 3,
        players: { N: null, S: null, E: null, W: null },
        seats: { N: null, S: null, E: null, W: null },
      },
    ],
  },
};
