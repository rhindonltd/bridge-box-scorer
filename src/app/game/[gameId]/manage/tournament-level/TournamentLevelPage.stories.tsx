import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { TournamentLevelPage } from "@/app/game/[gameId]/manage/tournament-level/TournamentLevelPage";

const meta: Meta<typeof TournamentLevelPage> = {
  title: "App/Manage/Game/TournamentLevel/TournamentLevelPage",
  component: TournamentLevelPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/tournament-level" },
    },
  },
  tags: ["autodocs"],
  args: { onDone: fn() },
};

export default meta;
type Story = StoryObj<typeof TournamentLevelPage>;

/** Default: the game's current level (Normal Club) with its derived fields. */
export const Default: Story = {};

/** A game already set to a higher level. */
export const NationalHeat: Story = {
  decorators: [withGame({ ...mockGame, tournamentLevel: "NATIONAL_HEAT" })],
};
