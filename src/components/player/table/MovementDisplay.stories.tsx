import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementDisplay from "./MovementDisplay";

const meta: Meta<typeof MovementDisplay> = {
  title: "Player/Table/MovementDisplay",
  component: MovementDisplay,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    roundNumber: 1,
    movements: [
      { direction: "NS", action: "stay" },
      { direction: "EW", action: "move", table: 3 },
    ],
  },
};

export default meta;

type Story = StoryObj<typeof MovementDisplay>;

export const Default: Story = {};

export const BothMove: Story = {
  args: {
    roundNumber: 2,
    movements: [
      { direction: "NS", action: "move", table: 5 },
      { direction: "EW", action: "move", table: 1 },
    ],
  },
};

export const SitOut: Story = {
  args: {
    roundNumber: 3,
    movements: [
      { direction: "NS", action: "sitout" },
      { direction: "EW", action: "move", table: 4 },
    ],
  },
};

export const BothStay: Story = {
  args: {
    roundNumber: 4,
    movements: [
      { direction: "NS", action: "stay" },
      { direction: "EW", action: "stay" },
    ],
  },
};
