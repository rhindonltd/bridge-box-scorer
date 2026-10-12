import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";
import { UploadEbuPage } from "@/app/game/[gameId]/manage/upload-ebu/UploadEbuPage";

function ebuStatus(configured: boolean, ebuNumber: string | null = null) {
  return http.get(swrKeys.ebu(), () =>
    HttpResponse.json({ result: { configured, ebuNumber } }),
  );
}

const meta: Meta<typeof UploadEbuPage> = {
  title: "App/Manage/Game/UploadEbu/UploadEbuPage",
  component: UploadEbuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/upload-ebu" },
    },
  },
  tags: ["autodocs"],
  args: { onCancel: fn() },
};

export default meta;
type Story = StoryObj<typeof UploadEbuPage>;

/** EBU configured: submission is available. */
export const Configured: Story = {
  parameters: {
    msw: { handlers: [ebuStatus(true, "1234567")] },
  },
};

/** Not configured: submission disabled with a pointer to Settings. */
export const NotConfigured: Story = {
  parameters: {
    msw: { handlers: [ebuStatus(false, null)] },
  },
};
