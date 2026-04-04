import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMP } from "@/components/results/leaderboard/IndividualMP";

const meta: Meta<typeof IndividualMP> = {
  title: "Components/Results/Leaderboard/IndividualMP",
  component: IndividualMP,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMP>;

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
