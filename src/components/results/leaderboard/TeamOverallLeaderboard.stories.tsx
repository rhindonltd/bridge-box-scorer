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
        pair1: {
          type: "PAIR",
          initialDirection: "NS",
          initialTableNumber: 1,
          player1: {
            firstName: "David",
            lastName: "Collier",
            nationalId: 404476,
          },
          player2: {
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: 477484,
          },
        },
        pair2: {
          type: "PAIR",
          initialDirection: "EW",
          initialTableNumber: 1,
          player1: {
            firstName: "Peter",
            lastName: "Collier",
            nationalId: 123456,
          },
          player2: {
            firstName: "Nye",
            lastName: "Collier",
            nationalId: 654321,
          },
        },
      },
    ],
    leaderboard: {
      type: "TEAM_OVERALL",
      mode: "TEAM",
      scoring: "OVERALL",
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
