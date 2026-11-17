import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ExportGamePage } from "@/app/game/[gameId]/export/ExportGamePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ExportGamePage> = {
  title: "App/Export/ExportGamePage",
  component: ExportGamePage,
  decorators: [
    withGame({ ...mockGame, finalisedAt: new Date().toISOString() }),
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/game/${mockGame.gameId}/export` },
    },
  },
  args: {
    onDownloadUsebioClick: fn(),
    onDownloadPbnClick: fn(),
    showClubWarning: false,
  },
};
export default meta;

type Story = StoryObj<typeof ExportGamePage>;

/** What a player sees: just the downloads. */
export const Player: Story = {};

/** A director whose club details are not set yet. */
export const DirectorClubMissing: Story = {
  args: { showClubWarning: true },
};
