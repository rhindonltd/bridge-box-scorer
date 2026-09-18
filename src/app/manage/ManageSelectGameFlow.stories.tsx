import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import type { BridgeGame } from "@/db/game-index/schema";
import { ManageSelectGameFlow } from "@/app/manage/ManageSelectGameFlow";

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
    bridgewebsEventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * The manage-game entry flow. Its default state is the game selector
 * (`ManageSelectGamePage`); picking a game the device isn't already a director
 * for would swap in the claim-code screen (covered by `ClaimDirectorCode`).
 */
const meta: Meta<typeof ManageSelectGameFlow> = {
  title: "App/Manage/ManageSelectGameFlow",
  component: ManageSelectGameFlow,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/manage" } },
    msw: {
      handlers: [
        http.get("/api/games/all", () =>
          HttpResponse.json({ result: { games } }),
        ),
      ],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ManageSelectGameFlow>;

/** Default: the game selector listing manageable games. */
export const Default: Story = {};
