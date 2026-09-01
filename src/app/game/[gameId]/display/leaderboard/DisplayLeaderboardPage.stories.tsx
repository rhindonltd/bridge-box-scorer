import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisplayLeaderboardPage } from "@/app/game/[gameId]/display/leaderboard/DisplayLeaderboardPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { pairsGame4Tables } from "@/mocks/fixtures/game";

const meta: Meta<typeof DisplayLeaderboardPage> = {
  title: "App/Display/Game/Leaderboard/DisplayLeaderboardPage",
  component: DisplayLeaderboardPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayLeaderboardPage>;

export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
