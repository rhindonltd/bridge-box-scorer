import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DownloadUsebioPage } from "@/app/game/[gameId]/manage/download-usebio/DownloadUsebioPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof DownloadUsebioPage> = {
  title: "App/Manage/Game/DownloadUsebio/DownloadUsebioPage",
  component: DownloadUsebioPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onUsebioDownloaded: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DownloadUsebioPage>;

export const Default: Story = {
  decorators: [withGame(mockGame)],
};
