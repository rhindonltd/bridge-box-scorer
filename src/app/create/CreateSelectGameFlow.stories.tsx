import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw/http";
import type { BridgeGame } from "@/db/game-index/schema";
import { CreateSelectGameFlow } from "@/app/create/CreateSelectGameFlow";

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

/**
 * The Create Game entry flow. Its default state is CreateSelectGamePage;
 * picking a game the device isn't already a director for swaps in the
 * claim-code screen (covered by ClaimDirectorCode).
 */
const meta: Meta<typeof CreateSelectGameFlow> = {
  title: "App/Create/CreateSelectGameFlow",
  component: CreateSelectGameFlow,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/create" } },
    msw: {
      handlers: [
        http.get("/api/games/not-started", () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof CreateSelectGameFlow>;

export const Default: Story = {};
