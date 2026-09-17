import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";
import { DownloadPbnPage } from "@/app/game/[gameId]/manage/download-pbn/DownloadPbnPage";

function clubHandler(club: { name: string; clubNumber: string } | null) {
  return http.get(swrKeys.club(), () =>
    HttpResponse.json({ result: { club } }),
  );
}

const meta: Meta<typeof DownloadPbnPage> = {
  title: "App/Manage/Game/DownloadPbn/DownloadPbnPage",
  component: DownloadPbnPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/download-pbn" },
    },
  },
  tags: ["autodocs"],
  args: { onPbnDownloaded: fn(), onCancel: fn() },
};

export default meta;
type Story = StoryObj<typeof DownloadPbnPage>;

/** Club configured: the PBN export is available (club name used as the Site). */
export const ClubConfigured: Story = {
  parameters: {
    msw: {
      handlers: [clubHandler({ name: "Anytown Bridge Club", clubNumber: "12345" })],
    },
  },
};

/** Club not configured: export is blocked with a pointer to Settings. */
export const ClubNotConfigured: Story = {
  parameters: {
    msw: { handlers: [clubHandler(null)] },
  },
};
