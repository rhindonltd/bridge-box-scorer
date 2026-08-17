import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TeamMatchLeaderboard } from "@/components/leaderboard/TeamMatchLeaderboard";

const meta: Meta<typeof TeamMatchLeaderboard> = {
  title: "Components/Results/Leaderboard/TeamMatchLeaderboard",
  component: TeamMatchLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TeamMatchLeaderboard>;

export const Default: Story = {
  args: {
    teams: [
      {
        type: "TEAM",
        pair1: {
          type: "PAIR",
          initialSeat: "1NS",
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
          initialSeat: "1EW",
          player1: {
            id: 3,
            firstName: "Peter",
            lastName: "Clark",
            nationalId: "123456",
          },
          player2: {
            id: 4,
            firstName: "Roy",
            lastName: "Button",
            nationalId: "654321",
          },
        },
      },
      {
        type: "TEAM",
        pair1: {
          type: "PAIR",
          initialSeat: "2NS",
          player1: {
            id: 5,
            firstName: "Piers",
            lastName: "Fuller",
            nationalId: null,
          },
          player2: {
            id: 6,
            firstName: "Sally",
            lastName: "Bennett",
            nationalId: null,
          },
        },
        pair2: {
          type: "PAIR",
          initialSeat: "2EW",
          player1: {
            id: 7,
            firstName: "Geoff",
            lastName: "Horn",
            nationalId: null,
          },
          player2: {
            id: 8,
            firstName: "Jill",
            lastName: "Horn",
            nationalId: null,
          },
        },
      },
    ],
    leaderboard: {
      type: "TEAM_MATCH",
      mode: "TEAM",
      scoring: "MATCH",
      lines: [
        {
          rank: 1,
          tied: false,
          teamId: "1",
          teamMatchLineScores: [
            { board: 1, opponent: "2", teamScore: 620, opponentScore: 430 },
            { board: 2, opponent: "2", teamScore: 170, opponentScore: 140 },
          ],
        },
        {
          rank: 2,
          tied: false,
          teamId: "2",
          teamMatchLineScores: [
            { board: 1, opponent: "1", teamScore: 430, opponentScore: 620 },
            { board: 2, opponent: "1", teamScore: 140, opponentScore: 170 },
          ],
        },
      ],
    },
  },
};
