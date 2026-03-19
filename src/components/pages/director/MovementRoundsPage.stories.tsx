import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementRoundsPage from "@/components/pages/director/MovementRoundsPage";

const meta: Meta<typeof MovementRoundsPage> = {
  title: "Pages/Director/MovementRoundsPage",
  component: MovementRoundsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementRoundsPage>;

export const Default: Story = {
  args: {
    name: 'Monday PM Pairs',
    tables: 9,
    rounds: 9,
    boardsPerRound: 3,
    arrowSwitchRounds: 0
  },
};
