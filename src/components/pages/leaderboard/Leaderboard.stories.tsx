import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LeaderboardPage } from "@/components/pages/leaderboard/LeaderboardPage";

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
  args: {
    eventName: "Monday PM Pairs",
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
};

export const IndividualMP: Story = {
  args: {
    eventName: "Monday PM Pairs",
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
};

export const PairIMP: Story = {
  args: {
    eventName: "Monday PM Pairs",
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
};

export const PairMP: Story = {
  args: {
    eventName: "Monday PM Pairs",
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
};

export const Team: Story = {
  args: {
    eventName: "Monday PM Pairs",
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
};
