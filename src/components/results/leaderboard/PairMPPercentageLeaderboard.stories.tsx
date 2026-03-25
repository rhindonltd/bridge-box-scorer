import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMPPercentageLeaderboard } from "@/components/results/leaderboard/PairMPPercentageLeaderboard";

const meta: Meta<typeof PairMPPercentageLeaderboard> = {
  title: "Components/Results/Leaderboard/PairMPPercentageLeaderboard",
  component: PairMPPercentageLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPPercentageLeaderboard>;

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
