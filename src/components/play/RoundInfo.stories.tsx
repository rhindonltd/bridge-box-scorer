import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import RoundInfo from "./RoundInfo";

const meta: Meta<typeof RoundInfo> = {
  title: "Components/Play/RoundInfo",
  component: RoundInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    table: 5,
    boards: [1, 2, 3],
    players: {
      N: { firstName: "Alice", lastName: "Smith" },
      S: { firstName: "Bob", lastName: "Johnson" },
      E: { firstName: "Carol", lastName: "Williams" },
      W: { firstName: "David", lastName: "Brown" },
    },
  },
};

export default meta;

type Story = StoryObj<typeof RoundInfo>;

export const Default: Story = {};

export const LaterRound: Story = {
  args: {
    table: 12,
    boards: [10, 11, 12],
  },
};

export const LongNames: Story = {
  args: {
    players: {
      N: { firstName: "Alexandria", lastName: "Montgomery-Wellington" },
      S: { firstName: "Christopher", lastName: "Van Der Berg" },
      E: { firstName: "Maximilian", lastName: "Fitzgerald-Smythe" },
      W: { firstName: "Elizabeth", lastName: "O’Connell-Rutherford" },
    },
  },
};
