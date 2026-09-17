import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";
import { UploadBridgewebsPage } from "@/app/game/[gameId]/manage/upload-bridgewebs/UploadBridgewebsPage";

function bridgewebsStatus(configured: boolean, club: string | null = null) {
  return http.get(swrKeys.bridgewebs(), () =>
    HttpResponse.json({ result: { configured, club } }),
  );
}

const meta: Meta<typeof UploadBridgewebsPage> = {
  title: "App/Manage/Game/UploadBridgewebs/UploadBridgewebsPage",
  component: UploadBridgewebsPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/upload-bridgewebs" },
    },
  },
  tags: ["autodocs"],
  args: { onCancel: fn() },
};

export default meta;
type Story = StoryObj<typeof UploadBridgewebsPage>;

/** BridgeWebs configured: upload is available. */
export const Configured: Story = {
  parameters: {
    msw: { handlers: [bridgewebsStatus(true, "anytownbc")] },
  },
};

/** Not configured: upload disabled with a pointer to Settings. */
export const NotConfigured: Story = {
  parameters: {
    msw: { handlers: [bridgewebsStatus(false, null)] },
  },
};
