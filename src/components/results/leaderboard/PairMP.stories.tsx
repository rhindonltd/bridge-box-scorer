import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
        initialSeat: "1NS",
        id: "1",
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
