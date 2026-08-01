import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LeaderboardPage } from "@/components/pages/leaderboard/LeaderboardPage";
import { Leaderboard } from "./Leaderboard";

const meta: Meta<typeof Leaderboard> = {
  title: "Pages/Results/Leaderboard/Leaderboard",
  component: Leaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LeaderboardPage>;

export const PairIMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_XIMP",
      participants: [
        {
          type: "PAIR",
          id: "1",
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
      ],
      overallScore: {
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [
          {
            tied: false,
            rank: 1,
            pairId: "1",
            crossImps: 10,
          },
        ],
      },
    },
  },
};

export const PairMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_MP",
      participants: [
        {
          type: "PAIR",
          id: "1",
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
      ],
      overallScore: {
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
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
  },
};

export const Team: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "TEAM_OVERALL",
      participants: [
        {
          type: "TEAM",
          id: "1",
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
      overallScore: {
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
  },
};
