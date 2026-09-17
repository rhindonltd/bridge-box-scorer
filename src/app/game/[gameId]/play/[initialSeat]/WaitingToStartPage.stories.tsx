import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";
import { WaitingToStartPage } from "@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage";

const GAME_ID = "abc123";

function sectionsHandler(sections: { section: string; label: string }[]) {
  return http.get(swrKeys.sections(GAME_ID), () =>
    HttpResponse.json({ result: { sections } }),
  );
}

const meta: Meta<typeof WaitingToStartPage> = {
  title: "App/Play/Game/Assignment/WaitingToStartPage",
  component: WaitingToStartPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/play/${GAME_ID}/A3NS` },
    },
  },
  tags: ["autodocs"],
  args: {
    gameId: GAME_ID,
  },
};

export default meta;
type Story = StoryObj<typeof WaitingToStartPage>;

/**
 * Single-section game: the seat's table and direction are shown, without a
 * (meaningless) section label.
 */
export const SingleSection: Story = {
  args: { seat: "A3NS" },
  parameters: {
    msw: { handlers: [sectionsHandler([{ section: "A", label: "A" }])] },
  },
};

/** Multi-section game: the section is included in the seat description. */
export const MultiSection: Story = {
  args: { seat: "B2EW" },
  parameters: {
    msw: {
      handlers: [
        sectionsHandler([
          { section: "A", label: "A" },
          { section: "B", label: "B" },
        ]),
      ],
    },
  },
};
