import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { http, HttpResponse } from "msw";
import type { BridgeGame } from "@/db/game-index/schema";
import SelectGamePage from "./SelectGamePage";
import { swrKeys } from "@/swr/swr-keys";

const games: BridgeGame[] = [
  {
    eventName: "Monday AM Pairs",
    director: null,
    gameType: "PAIRS",
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    eventName: "Tuesday PM Teams",
    director: null,
    gameType: "TEAMS",
    scoringType: "IMP",
    sectionName: "",
    gameId: "game-2",
    eventDate: new Date().toISOString(),
    tables: 6,
    leadCardRequired: false,
    selectedMovement: null,
    handEntryEnabled: false,
    combinedRanking: true,
    bridgewebsEventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const meta: Meta<typeof SelectGamePage> = {
  title: "Components/Pages/SelectGamePage",
  component: SelectGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/join" } },
  },
  tags: ["autodocs"],
  args: {
    headerTitle: "Join Game",
    onGameSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectGamePage>;

/** Games are available to select. */
export const WithGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.joinableGames(), () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
};

/** No games available. */
export const NoGames: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.joinableGames(), () =>
          HttpResponse.json({ result: { games: [] } }),
        ),
      ],
    },
  },
};
