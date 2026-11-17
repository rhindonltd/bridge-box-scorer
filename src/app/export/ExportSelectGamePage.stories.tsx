import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw/http";
import type { BridgeGame } from "@/db/game-index/schema";
import ExportSelectGamePage from "@/app/export/ExportSelectGamePage";

const games: BridgeGame[] = [
  {
    eventName: "Monday AM Pairs",
    director: "Jane Director",
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "MP",
    sectionName: "",
    gameId: "game-1",
    eventDate: new Date().toISOString(),
    tables: 10,
    leadCardRequired: true,
    selectedMovement: null,
    handEntryEnabled: false,
    combinedRanking: true,
    bridgewebsEventId: null,
    tournamentLevel: "NORMAL_CLUB",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finalisedAt: new Date().toISOString(),
  },
];

const meta: Meta<typeof ExportSelectGamePage> = {
  title: "App/Export/ExportSelectGamePage",
  component: ExportSelectGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/export" } },
  },
  tags: ["autodocs"],
  args: { onGameSelected: fn() },
};
export default meta;

type Story = StoryObj<typeof ExportSelectGamePage>;

/** Finalised games are listed for export. */
export const WithGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/finalised", () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
};

/** Nothing has been finalised yet. */
export const NoGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/finalised", () =>
          HttpResponse.json({ result: { games: [] } }),
        ),
      ],
    },
  },
};
