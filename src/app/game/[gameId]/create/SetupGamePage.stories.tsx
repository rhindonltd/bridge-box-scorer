import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { SetupGamePage } from "./SetupGamePage";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const GAME_ID = mockGame.gameId;

// SetupGamePage is a multi-step flow (tables / movement / timer / sections /
// start) selected via a URL search param. Its default landing step is Tables,
// which reads the game's pairs and sections. The individual step screens
// (ShowTablesPage, MovementStep, StartGameScreen, TimerSetup) each have their
// own stories, so this story exercises the flow shell at its default step with
// real (mocked) data rather than re-mocking every step here.
const meta: Meta<typeof SetupGamePage> = {
  title: "App/Create/Game/SetupGamePage",
  component: SetupGamePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/game/${GAME_ID}/create` },
    },
    msw: {
      handlers: [
        http.get(swrKeys.pairs(GAME_ID), () =>
          HttpResponse.json({ result: { pairs: [] } }),
        ),
        http.get(swrKeys.sections(GAME_ID), () =>
          HttpResponse.json({
            result: {
              sections: [
                {
                  section: "A",
                  label: "A",
                  tables: 5,
                  ordinal: 0,
                  selectedMovement: null,
                },
              ],
            },
          }),
        ),
      ],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SetupGamePage>;

/** The default setup step (Tables), with the game's pairs/sections loaded. */
export const TablesStep: Story = {};
