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
        id: "1",
        initialSeat: "1E",
        player: {
          id: 1,
          firstName: "David",
          lastName: "Collier",
          nationalId: "404476",
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
