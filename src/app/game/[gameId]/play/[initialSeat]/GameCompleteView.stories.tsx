import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameCompleteView } from "@/app/game/[gameId]/play/[initialSeat]/GameCompleteView";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import type { OverallScoreAndParticipant } from "@/model/leaderboard";

// A small two-pair matchpoint leaderboard, mirroring the fixtures used by the
// Leaderboard component's own stories.
const pairMpLeaderboard: OverallScoreAndParticipant = {
  type: "PAIR_MP",
  participants: [
    {
      type: "PAIR",
      id: "1",
      initialSeat: "A1NS",
      player1: { id: 1, firstName: "David", lastName: "Collier", nationalId: "404476" },
      player2: { id: 2, firstName: "Jacqui", lastName: "Collier", nationalId: "477484" },
    },
    {
      type: "PAIR",
      id: "2",
      initialSeat: "A1EW",
      player1: { id: 3, firstName: "Roy", lastName: "Button", nationalId: "111111" },
      player2: { id: 4, firstName: "Nadia", lastName: "Button", nationalId: "222222" },
    },
  ],
  overallScore: {
    type: "PAIR_MP",
    mode: "PAIR",
    scoring: "MP",
    lines: [
      { tied: false, rank: 1, pairId: "1", totalMP: 15, maxMP: 20 },
      { tied: false, rank: 2, pairId: "2", totalMP: 5, maxMP: 20 },
    ],
  },
};

const meta: Meta<typeof GameCompleteView> = {
  title: "App/Play/Game/Assignment/GameCompleteView",
  component: GameCompleteView,
  // GamePageLayout's GameHeaderBar reads the game from context.
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    // GamePageLayout's header uses the Next app router (useBackNavigation), so
    // the story must mount the app-router context.
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/play/abc123/1NS" },
    },
  },
  tags: ["autodocs"],
  args: {
    leaderboard: null,
    isLoading: false,
  },
};

export default meta;
type Story = StoryObj<typeof GameCompleteView>;

/** Leaderboard still loading — a spinner is shown. */
export const Loading: Story = {
  args: { isLoading: true },
};

/**
 * No leaderboard to show (e.g. it hasn't arrived): a plain acknowledgement that
 * the game is over.
 */
export const NoLeaderboard: Story = {
  args: { leaderboard: null },
};

/** The final standings are shown. */
export const WithLeaderboard: Story = {
  args: { leaderboard: pairMpLeaderboard },
};

/** The viewing pair's row is highlighted in the final standings. */
export const HighlightingViewingPair: Story = {
  args: {
    leaderboard: pairMpLeaderboard,
    highlightAssignmentId: "1",
  },
};
