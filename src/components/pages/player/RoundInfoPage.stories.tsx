import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RoundInfoPage } from "@/components/pages/player/RoundInfoPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof RoundInfoPage> = {
  title: "Pages/Player/RoundInfoPage",
  component: RoundInfoPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    round: 1,
    table: 5,
    boards: [1, 2, 3],
    players: {
      N: { firstName: "Alice", lastName: "Smith" },
      S: { firstName: "Bob", lastName: "Johnson" },
      E: { firstName: "Carol", lastName: "Williams" },
      W: { firstName: "David", lastName: "Brown" },
    },
    onEnterRound: () => alert("Enter Round clicked"),
  },
};

export default meta;

type Story = StoryObj<typeof RoundInfoPage>;

export const Default: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
};

export const LaterRound: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    round: 4,
    table: 12,
    boards: [10, 11, 12],
  },
};

export const LongNames: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    players: {
      N: { firstName: "Alexandria", lastName: "Montgomery-Wellington" },
      S: { firstName: "Christopher", lastName: "Van Der Berg" },
      E: { firstName: "Maximilian", lastName: "Fitzgerald-Smythe" },
      W: { firstName: "Elizabeth", lastName: "O’Connell-Rutherford" },
    },
  },
};
