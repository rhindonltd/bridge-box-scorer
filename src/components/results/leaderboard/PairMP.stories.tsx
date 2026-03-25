import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMP } from "@/components/results/leaderboard/PairMP";

const meta: Meta<typeof PairMP> = {
  title: "Components/Results/Leaderboard/PairMP",
  component: PairMP,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMP>;

export const Default: Story = {
  args: {
    leaderboard: {
      type: "PAIR_MP",
      lines: [
        {
          tied: false,
          rank: 1,
          pairId: "1",
          totalMP: 10,
          maxMP: 20,
        },
      ],
    },
  },
};
