import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import { DownloadUsebioPage } from "@/app/game/[gameId]/manage/download-usebio/DownloadUsebioPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

function clubHandler(club: { name: string; clubNumber: string } | null) {
  return http.get(swrKeys.club(), () =>
    HttpResponse.json({ result: { club } }),
  );
}

const meta: Meta<typeof DownloadUsebioPage> = {
  title: "App/Manage/Game/DownloadUsebio/DownloadUsebioPage",
  component: DownloadUsebioPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/download-usebio" },
    },
  },
  tags: ["autodocs"],
  args: {
    onUsebioDownloaded: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DownloadUsebioPage>;

/** Club configured: the USEBIO export is available with the club details shown. */
export const ClubConfigured: Story = {
  parameters: {
    msw: {
      handlers: [clubHandler({ name: "Anytown Bridge Club", clubNumber: "999" })],
    },
  },
};

/** Club not configured: export blocked with a pointer to Settings. */
export const ClubNotConfigured: Story = {
  parameters: {
    msw: { handlers: [clubHandler(null)] },
  },
};
