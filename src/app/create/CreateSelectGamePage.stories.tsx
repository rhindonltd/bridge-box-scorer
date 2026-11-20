import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw/http";
import type { BridgeGame } from "@/db/game-index/schema";
import CreateSelectGamePage from "@/app/create/CreateSelectGamePage";

const games: BridgeGame[] = [
  {
    eventName: "Wednesday Pairs",
    director: "Jane Director",
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "MP",
    sectionName: "",
    gameId: "game-1",
    eventDate: new Date().toISOString(),
    tables: 6,
    leadCardRequired: true,
    selectedMovement: null,
    handEntryEnabled: false,
    combinedRanking: true,
    bridgewebsEventId: null,
    tournamentLevel: "NORMAL_CLUB",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finalisedAt: null,
  },
];

const meta: Meta<typeof CreateSelectGamePage> = {
  title: "App/Create/CreateSelectGamePage",
  component: CreateSelectGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/create" } },
  },
  tags: ["autodocs"],
  args: { onGameSelected: fn() },
};
export default meta;

type Story = StoryObj<typeof CreateSelectGamePage>;

/** A game still being set up is listed below the Create Game button. */
export const WithGamesInSetup: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/not-started", () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
};

/** Nothing waiting to start: just the Create Game button. */
export const NoGamesInSetup: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/games/not-started", () =>
          HttpResponse.json({ result: { games: [] } }),
        ),
      ],
    },
  },
};
