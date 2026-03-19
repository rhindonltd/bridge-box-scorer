import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MovementTablesPage from "@/components/pages/director/MovementTablesPage";

const meta: Meta<typeof MovementTablesPage> = {
  title: "Pages/Director/MovementTablesPage",
  component: MovementTablesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementTablesPage>;

export const Default: Story = {
  args: {
    name: 'Monday PM Pairs',
    tables: 9,
    rounds: 9,
    boardsPerRound: 3,
    arrowSwitchRounds: 0
  },
};
