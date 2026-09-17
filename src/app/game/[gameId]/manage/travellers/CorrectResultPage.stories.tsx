import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse, delay } from "msw";
import { CorrectResultPage } from "@/app/game/[gameId]/manage/travellers/CorrectResultPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const GAME_ID = mockGame.gameId;

function boardsHandler(boards: number[]) {
  return http.get(swrKeys.boards(GAME_ID), () =>
    HttpResponse.json({ result: { boards } }),
  );
}

// CorrectResultPage is a director state machine: board select → traveller →
// contract wizard. The initial board-selector state is data-driven (the game's
// boards); the deeper steps require interaction and are covered by
// CorrectResultPage.test.tsx. These stories exercise the entry state for real.
const meta: Meta<typeof CorrectResultPage> = {
  title: "App/Manage/Game/CorrectResult/CorrectResultPage",
  component: CorrectResultPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/game/${GAME_ID}/manage/travellers` },
    },
  },
  tags: ["autodocs"],
  args: {
    onResultCorrected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CorrectResultPage>;

/** Board selector populated with the game's boards. */
export const SelectBoard: Story = {
  parameters: {
    msw: { handlers: [boardsHandler([1, 2, 3, 4, 5, 6, 7, 8])] },
  },
};

/** No boards yet. */
export const NoBoards: Story = {
  parameters: {
    msw: { handlers: [boardsHandler([])] },
  },
};

/** Boards still loading. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.boards(GAME_ID), async () => {
          await delay("infinite");
          return HttpResponse.json({ result: { boards: [] } });
        }),
      ],
    },
  },
};
