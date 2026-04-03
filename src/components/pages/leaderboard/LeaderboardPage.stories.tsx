import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LeaderboardPage } from "@/components/pages/leaderboard/LeaderboardPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof LeaderboardPage> = {
  title: "Pages/Leaderboard/LeaderboardPage",
  component: LeaderboardPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LeaderboardPage>;

export const IndividualIMP: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    overallScoreAndParticipant: {
      type: "INDIVIDUAL_IMP",
      participants: [
        {
          type: "INDIVIDUAL",
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
            type: "INDIVIDUAL",
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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    overallScoreAndParticipant: {
      type: "INDIVIDUAL_MP",
      participants: [
        {
          type: "INDIVIDUAL",
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
            type: "INDIVIDUAL",
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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_IMP",
      participants: [
        {
          type: "PAIR",
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
            type: "PAIR",
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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_MP",
      participants: [
        {
          type: "PAIR",
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
            type: "PAIR",
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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    overallScoreAndParticipant: {
      type: "TEAM_OVERALL",
      participants: [
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
              nationalId: 654321,
            },
          ],
        },
      ],
      overallScore: {
        type: "TEAM_OVERALL",
        lines: [
          {
            type: "TEAM",
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
