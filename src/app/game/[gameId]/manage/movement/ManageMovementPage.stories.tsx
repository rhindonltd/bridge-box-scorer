import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse, delay } from "msw";
import { mocked } from "storybook/test";
import { ManageMovementPage } from "@/app/game/[gameId]/manage/movement/ManageMovementPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";
import type { MovementByTable } from "@/movement/movementData";
// Imported with the full relative path + extension so the mocked() call below
// targets the same module instance registered for mocking in
// .storybook/preview.tsx (used by the embedded SwissDrawControl).
import { drawNextSwissRound } from "../../../../../lib/swiss-service";

const GAME_ID = mockGame.gameId;

// A single-section game with a tiny 2-table / 2-round movement.
const singleSection = [
  { section: "A", label: "A", tables: 2, ordinal: 0, selectedMovement: null },
];

// A single-section game whose section is set up as a Swiss Pairs movement, so
// ManageMovementPage renders the SwissDrawControl above the movement table.
const swissSection = [
  {
    section: "A",
    label: "A",
    tables: 2,
    ordinal: 0,
    selectedMovement: {
      source: "SWISS",
      swiss: { tables: 2, rounds: 7, boardsPerRound: 2 },
    },
  },
];

const tables: MovementByTable[] = [
  {
    tableNumber: 1,
    rounds: [
      { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 2 },
      { roundNumber: 2, ns: "1", ew: "4", boardStart: 3, boardEnd: 4 },
    ],
  },
  {
    tableNumber: 2,
    rounds: [
      { roundNumber: 1, ns: "3", ew: "4", boardStart: 3, boardEnd: 4 },
      { roundNumber: 2, ns: "3", ew: "2", boardStart: 1, boardEnd: 2 },
    ],
  },
];

const sectionsHandler = http.get(swrKeys.sections(GAME_ID), () =>
  HttpResponse.json({ result: { sections: singleSection } }),
);
const resultsSummaryHandler = http.get(swrKeys.resultsSummary(GAME_ID), () =>
  HttpResponse.json({ result: { allResultsIn: false } }),
);

const meta: Meta<typeof ManageMovementPage> = {
  title: "App/Manage/Game/Movement/ManageMovementPage",
  component: ManageMovementPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/game/${GAME_ID}/manage/movement` },
    },
  },
  tags: ["autodocs"],
  args: { backHref: "/games" },
};

export default meta;
type Story = StoryObj<typeof ManageMovementPage>;

/** The movement is loaded and displayed. */
export const Loaded: Story = {
  parameters: {
    msw: {
      handlers: [
        sectionsHandler,
        resultsSummaryHandler,
        http.get(`/api/games/${GAME_ID}/movement`, () =>
          HttpResponse.json({ result: { movement: { type: "MITCHELL", tables } } }),
        ),
      ],
    },
  },
};

/** No movement has been set up for the section yet. */
export const NoMovement: Story = {
  parameters: {
    msw: {
      handlers: [
        sectionsHandler,
        resultsSummaryHandler,
        http.get(`/api/games/${GAME_ID}/movement`, () =>
          HttpResponse.json({ result: { movement: { type: "NONE", tables: [] } } }),
        ),
      ],
    },
  },
};

/** Movement still loading — the layout shell with a spinner. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        sectionsHandler,
        resultsSummaryHandler,
        http.get(`/api/games/${GAME_ID}/movement`, async () => {
          await delay("infinite");
          return HttpResponse.json({ result: { movement: { type: "NONE", tables: [] } } });
        }),
      ],
    },
  },
};

/**
 * A Swiss Pairs section: the movement table is shown with the director's "Draw
 * Next Round" control above it. All results are in, so the button is enabled
 * and ready to draw. The draw itself is mocked to resolve cleanly (there is no
 * Socket.IO server in Storybook).
 */
export const SwissPairs: Story = {
  beforeEach: () => {
    mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });
  },
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.sections(GAME_ID), () =>
          HttpResponse.json({ result: { sections: swissSection } }),
        ),
        http.get(swrKeys.resultsSummary(GAME_ID), () =>
          HttpResponse.json({ result: { allResultsIn: true } }),
        ),
        http.get(`/api/games/${GAME_ID}/movement`, () =>
          HttpResponse.json({ result: { movement: { type: "SWISS", tables } } }),
        ),
      ],
    },
  },
};

/**
 * A Swiss Pairs section where the current round is still being played: the
 * "Draw Next Round" button is disabled until every result is in.
 */
export const SwissPairsWaiting: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.sections(GAME_ID), () =>
          HttpResponse.json({ result: { sections: swissSection } }),
        ),
        http.get(swrKeys.resultsSummary(GAME_ID), () =>
          HttpResponse.json({ result: { allResultsIn: false } }),
        ),
        http.get(`/api/games/${GAME_ID}/movement`, () =>
          HttpResponse.json({ result: { movement: { type: "SWISS", tables } } }),
        ),
      ],
    },
  },
};
