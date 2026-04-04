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

export const IndividualIMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "INDIVIDUAL_IMP",
      participants: [
        {
          type: "INDIVIDUAL",
          initialTableNumber: 1,
          initialDirection: "E",
          playerId: "1",
          player: {
            firstName: "David",
            lastName: "Collier",
            nationalId: 404476,
          },
        },
      ],
      overallScore: {
        type: "INDIVIDUAL_IMP",
        lines: [
          {
            rank: 1,
            tied: false,
            playerId: "1",
            crossImps: 10,
          },
        ],
      },
    },
  },
};

export const IndividualMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "INDIVIDUAL_MP",
      participants: [
        {
          type: "INDIVIDUAL",
          initialTableNumber: 1,
          initialDirection: "E",
          playerId: "1",
          player: {
            firstName: "David",
            lastName: "Collier",
            nationalId: 404476,
          },
        },
      ],
      overallScore: {
        type: "INDIVIDUAL_MP",
        lines: [
          {
            tied: false,
            rank: 1,
            playerId: "1",
            totalMP: 10,
            maxMP: 20,
          },
        ],
      },
    },
  },
};

export const PairIMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_IMP",
      participants: [
        {
          type: "PAIR",
          initialTableNumber: 1,
          initialDirection: "NS",
          pairId: "1",
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
      ],
      overallScore: {
        type: "PAIR_IMP",
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
          initialTableNumber: 1,
          initialDirection: "NS",
          pairId: "1",
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
      ],
      overallScore: {
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
  },
};

export const Team: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "TEAM_OVERALL",
      participants: [
        {
          type: "TEAM",
          initialTableNumber: 1,
          teamId: "1",
          players: [
            {
              firstName: "David",
              lastName: "Collier",
              nationalId: 404476,
            },
          ],
        },
      ],
      overallScore: {
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
  },
};
