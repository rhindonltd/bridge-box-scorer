import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import type { BridgeGame } from "@/db/game-index/schema";
import { swrKeys } from "@/swr/swr-keys";
import { JoinGamePage } from "@/app/join/JoinGamePage";

/** A couple of joinable games, using the BridgeGame row shape. */
const games: BridgeGame[] = [
  {
    eventName: "Monday AM Pairs",
    director: null,
    gameType: "PAIRS",
    scoringType: "MP",
    sessionName: "",
    sectionName: "",
    gameId: "game-1",
    eventDate: new Date().toISOString(),
    tables: 10,
    leadCardRequired: true,
    selectedMovement: null,
    bridgewebsEventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    eventName: "Tuesday PM Teams",
    director: null,
    gameType: "TEAMS",
    scoringType: "IMP",
    sessionName: "Session 1",
    sectionName: "",
    gameId: "game-2",
    eventDate: new Date().toISOString(),
    tables: 6,
    leadCardRequired: false,
    selectedMovement: null,
    bridgewebsEventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const meta: Meta<typeof JoinGamePage> = {
  title: "App/Join/JoinGamePage",
  component: JoinGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/join" } },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof JoinGamePage>;

/** Joinable games are listed. */
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

/** No games available to join. */
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
