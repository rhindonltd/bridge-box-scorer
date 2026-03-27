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
    teams: [
      {
        type: "TEAM",
        teamId: "1",
        players: [
          {
            firstName: "David",
            lastName: "Collier",
            nationalId: 404476,
          },
          {
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: 477484,
          },
          {
            firstName: "Peter",
            lastName: "Collier",
            nationalId: 123456,
          },
          {
            firstName: "Andrew",
            lastName: "Robson",
            nationalId: 234567,
          },
        ],
      },
    ],
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
