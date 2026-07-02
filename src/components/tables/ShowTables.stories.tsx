import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ShowTables from "./ShowTables";

const meta: Meta<typeof ShowTables> = {
  title: "Components/Tables/ShowTables",
  component: ShowTables,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ShowTables>;

export const Default: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: {
          N: {
            id: 1,
            firstName: "xx",
            lastName: "yy",
            nationalId: null,
          },
          S: null,
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
      },
    ],
  },
};
