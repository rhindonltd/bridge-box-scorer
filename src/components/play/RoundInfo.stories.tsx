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
      N: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: "123456" },
      S: { id: 2, firstName: "Bob", lastName: "Johnson", nationalId: null },
      E: { id: 3, firstName: "Carol", lastName: "Williams", nationalId: null },
      W: { id: 4, firstName: "David", lastName: "Brown", nationalId: null },
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
      N: {
        id: 1,
        firstName: "Alexandria",
        lastName: "Montgomery-Wellington",
        nationalId: "123456",
      },
      S: {
        id: 2,
        firstName: "Christopher",
        lastName: "Van Der Berg",
        nationalId: null,
      },
      E: {
        id: 3,
        firstName: "Maximilian",
        lastName: "Fitzgerald-Smythe",
        nationalId: null,
      },
      W: {
        id: 4,
        firstName: "Elizabeth",
        lastName: "O’Connell-Rutherford",
        nationalId: null,
      },
    },
  },
};
