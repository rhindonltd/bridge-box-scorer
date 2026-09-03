import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TeamOverallLeaderboard } from "@/components/leaderboard/TeamOverallLeaderboard";

const meta: Meta<typeof TeamOverallLeaderboard> = {
  title: "Components/Leaderboard/TeamOverallLeaderboard",
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
        id: "1",
        pair1: {
          type: "PAIR",
          initialSeat: "A1NS",
          player1: {
            id: 1,
            firstName: "David",
            lastName: "Collier",
            nationalId: "404476",
          },
          player2: {
            id: 2,
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: "477484",
          },
        },
        pair2: {
          type: "PAIR",
          initialSeat: "A1EW",
          player1: {
            id: 1,
            firstName: "Peter",
            lastName: "Collier",
            nationalId: "123456",
          },
          player2: {
            id: 2,
            firstName: "Nye",
            lastName: "Collier",
            nationalId: "654321",
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
