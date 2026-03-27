import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairMPLeaderboard } from "./PairMPLeaderboard";

const meta: Meta<typeof PairMPLeaderboard> = {
  title: "Components/Results/Leaderboard/PairMPLeaderboard",
  component: PairMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPLeaderboard>;

export const Default: Story = {
  args: {
    pairs: [
      {
        type: "PAIR",
        pairId: "1",
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
        ],
      },
    ],
    leaderboard: {
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
