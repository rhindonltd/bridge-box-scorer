import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import CardTable from "./CardTable";

const meta: Meta<typeof CardTable> = {
  title: "Components/Common/CardTable",
  component: CardTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof CardTable>;

export const Default: Story = {
  args: {
    tableNumber: 5,
    players: {
      N: {
        firstName: "Jacqui",
        lastName: "Collier",
        nationalId: "477484",
      },
      S: {
        firstName: "David",
        lastName: "Collier",
        nationalId: "404476",
      },
      E: {
        firstName: "Peter",
        lastName: "Collier",
        nationalId: "123456",
      },
      W: null,
    },
  },
};
