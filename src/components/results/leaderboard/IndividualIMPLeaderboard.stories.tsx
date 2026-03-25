import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualIMPLeaderboard } from "@/components/results/leaderboard/IndividualIMPLeaderboard";

const meta: Meta<typeof IndividualIMPLeaderboard> = {
  title: "Components/Results/Leaderboard/IndividualIMPLeaderboard",
  component: IndividualIMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualIMPLeaderboard>;

export const Default: Story = {
  args: {
    leaderboard: {
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
