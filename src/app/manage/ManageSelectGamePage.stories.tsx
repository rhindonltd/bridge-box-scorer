import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import type { BridgeGame } from "@/db/game-index/schema";
import ManageSelectGamePage from "@/app/manage/ManageSelectGamePage";

const games: BridgeGame[] = [
  {
    eventName: "Monday AM Pairs",
    director: "Jane Director",
    gameType: "PAIRS",
    scoringType: "MP",
    sessionName: "",
    sectionName: "",
    gameId: "game-1",
    eventDate: new Date().toISOString(),
    tables: 10,
    leadCardRequired: true,
    selectedMovement: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const meta: Meta<typeof ManageSelectGamePage> = {
  title: "App/Manage/ManageSelectGamePage",
  component: ManageSelectGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/manage" } },
  },
  tags: ["autodocs"],
  args: { onGameSelected: fn() },
};

export default meta;
type Story = StoryObj<typeof ManageSelectGamePage>;

/** Existing games are listed for management. */
export const WithGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/all", () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
};

/** No games created yet. */
export const NoGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/all", () =>
          HttpResponse.json({ result: { games: [] } }),
        ),
      ],
    },
  },
};
