import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { FinaliseGameScreen } from "@/app/game/[gameId]/manage/finalise/FinaliseGameScreen";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const GAME_ID = mockGame.gameId;

const meta: Meta<typeof FinaliseGameScreen> = {
  title: "App/Manage/Finalise/FinaliseGameScreen",
  component: FinaliseGameScreen,
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FinaliseGameScreen>;

function check(result: unknown) {
  return http.get(swrKeys.finaliseCheck(GAME_ID), () =>
    HttpResponse.json({ success: true, result }),
  );
}

export const ResultsOutstanding: Story = {
  parameters: {
    msw: {
      handlers: [
        check({
          canFinalise: false,
          problems: [
            {
              code: "RESULTS_OUTSTANDING",
              message:
                "No result yet: Round 3 · Table 2 · Board 7 (Ann & Bob vs Cy & Di).",
            },
          ],
        }),
      ],
    },
  },
};

export const Ready: Story = {
  parameters: {
    msw: { handlers: [check({ canFinalise: true, problems: [] })] },
  },
};
