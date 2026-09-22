import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { LeaderboardModePage } from "@/app/game/[gameId]/display/leaderboard/LeaderboardModePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { pairsGame4Tables } from "@/mocks/fixtures/game";

const meta: Meta<typeof LeaderboardModePage> = {
  title: "App/Display/Game/Leaderboard/LeaderboardModePage",
  component: LeaderboardModePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
    onBack: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof LeaderboardModePage>;

/**
 * The step shown before the room-display leaderboard for a matchpoint pairs
 * game, choosing whether the standings show as a percentage or raw matchpoints.
 * Intentionally single-state — two choice buttons with no data — so there is
 * one story. (The page's header reads the game from context, so it is wrapped
 * with a game like the display menu.)
 */
export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
