import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairIMPLeaderboard } from "./PairIMPLeaderboard";

const meta: Meta<typeof PairIMPLeaderboard> = {
  title: "Components/Results/Leaderboard/PairIMPLeaderboard",
  component: PairIMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairIMPLeaderboard>;

export const Default: Story = {
  args: {
    pairs: [
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
    leaderboard: {
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
};
