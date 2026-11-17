import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { ExportDirectorSection } from "@/app/game/[gameId]/export/ExportDirectorSection";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const meta: Meta<typeof ExportDirectorSection> = {
  title: "App/Export/ExportDirectorSection",
  component: ExportDirectorSection,
  decorators: [
    withGame({ ...mockGame, finalisedAt: new Date().toISOString() }),
  ],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  args: { gameId: mockGame.gameId },
};
export default meta;

type Story = StoryObj<typeof ExportDirectorSection>;

/** BridgeWebs and the EBU are both set up in Settings. */
export const UploadsConfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.bridgewebs(), () =>
          HttpResponse.json({ result: { configured: true, club: "demo" } }),
        ),
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({ result: { configured: true, ebuNumber: "123" } }),
        ),
      ],
    },
  },
};

/** Nothing configured: only the level and Reopen game remain. */
export const NothingConfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.bridgewebs(), () =>
          HttpResponse.json({ result: { configured: false } }),
        ),
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({ result: { configured: false } }),
        ),
      ],
    },
  },
};
