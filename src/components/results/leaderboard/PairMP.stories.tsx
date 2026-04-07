import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMP } from "@/components/results/leaderboard/PairMP";

const meta: Meta<typeof PairMP> = {
  title: "Components/Results/Leaderboard/PairMP",
  component: PairMP,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMP>;

export const Default: Story = {
  args: {
    pairs: [
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
    leaderboard: {
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
};
