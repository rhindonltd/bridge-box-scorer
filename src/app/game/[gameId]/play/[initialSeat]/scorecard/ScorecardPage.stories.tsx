import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ScorecardPage } from "@/app/game/[gameId]/play/[initialSeat]/scorecard/ScorecardPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import type { PairScorecard, ScorecardBoard } from "@/model/scorecard";

const board = (
  boardNumber: number,
  outcome: string,
  score: number | null,
  value: number,
): ScorecardBoard => ({
  roundNumber: Math.ceil(boardNumber / 3),
  boardNumber,
  side: "NS",
  opponentId: `A${Math.ceil(boardNumber / 3)}EW`,
  outcome,
  score,
  matchpoints: { value, max: 8 },
});

const mpCard: PairScorecard = {
  pairId: "A1NS",
  scoring: "MP",
  boards: [
    board(1, "3NTN+1", 430, 7),
    board(2, "4SN-1", -100, 2),
    board(3, "PO", 0, 4),
    board(4, "A60/40", null, 4.8),
    board(5, "2HSX=", 470, 8),
    board(6, "NP", null, 4),
  ],
  roundVps: null,
};

const meta: Meta<typeof ScorecardPage> = {
  title: "App/Play/ScorecardPage",
  component: ScorecardPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    card: mpCard,
    loading: false,
    hideSection: true,
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ScorecardPage>;

/** A matchpoint pairs event: % / MP toggle, a total, adjusted and NP boards. */
export const Matchpoints: Story = {};

/** A Cross-IMP pairs event: one view, no toggle. */
export const CrossImps: Story = {
  args: {
    card: {
      ...mpCard,
      scoring: "XIMP",
      boards: mpCard.boards.map((b, i) => ({
        ...b,
        matchpoints: undefined,
        crossImps: [4.5, -3.25, 0, 3, 7.75, 0][i],
      })),
    },
  },
};

/** A Swiss Pairs event: board scores plus Victory Points per round. */
export const SwissPairs: Story = {
  args: {
    card: {
      ...mpCard,
      roundVps: [
        { roundNumber: 1, opponentId: "A1EW", vp: 13.58 },
        { roundNumber: 2, opponentId: "A2EW", vp: 9.12 },
      ],
    },
  },
};

/** Nothing played yet. */
export const NoBoardsYet: Story = {
  args: { card: { ...mpCard, boards: [] } },
};

/** Still loading. */
export const Loading: Story = {
  args: { card: null, loading: true },
};
