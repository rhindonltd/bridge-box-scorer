import type { Meta, StoryObj } from "@storybook/react-vite";
import { TeamOverallLeaderboard } from "@/components/results/leaderboard/TeamOverallLeaderboard";

const meta: Meta<typeof TeamOverallLeaderboard> = {
  title: "Components/Results/Leaderboard/TeamOverallLeaderboard",
  component: TeamOverallLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TeamOverallLeaderboard>;

export const Default: Story = {
  args: {
    leaderboard: {
      type: "TEAM_OVERALL",
      lines: [
        {
          tied: false,
          rank: 1,
          teamId: "1",
          score: 100,
        },
      ],
    },
  },
};
