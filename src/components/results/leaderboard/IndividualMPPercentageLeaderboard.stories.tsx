import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMPPercentageLeaderboard } from "@/components/results/leaderboard/IndividualMPPercentageLeaderboard";

const meta: Meta<typeof IndividualMPPercentageLeaderboard> = {
  title: "Components/Results/Leaderboard/IndividualMPPercentageLeaderboard",
  component: IndividualMPPercentageLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMPPercentageLeaderboard>;

export const Default: Story = {
  args: {
    individuals: [
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
    leaderboard: {
      type: "INDIVIDUAL_MP",
      mode: "INDIVIDUAL",
      scoring: "MP",
      lines: [
        {
          rank: 1,
          tied: false,
          playerId: "1",
          totalMP: 50,
          maxMP: 100,
        },
      ],
    },
  },
};
