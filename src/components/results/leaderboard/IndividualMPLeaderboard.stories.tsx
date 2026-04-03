import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMPLeaderboard } from "@/components/results/leaderboard/IndividualMPLeaderboard";

const meta: Meta<typeof IndividualMPLeaderboard> = {
  title: "Components/Results/Leaderboard/IndividualMPLeaderboard",
  component: IndividualMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMPLeaderboard>;

export const Default: Story = {
  args: {
    individuals: [
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
    leaderboard: {
      type: "INDIVIDUAL_MP",
      lines: [
        {
          type: "INDIVIDUAL",
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
