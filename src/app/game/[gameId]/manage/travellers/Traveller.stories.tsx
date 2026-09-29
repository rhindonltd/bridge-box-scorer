import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Traveller } from "@/app/game/[gameId]/manage/travellers/Traveller";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof Traveller> = {
  title: "App/Manage/Game/CorrectResult/Traveller",
  component: Traveller,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLineSelected: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Traveller>;

export const PairsWithNames: Story = {
  args: {
    boardNumber: 7,
    isLoading: false,
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "1NS",
          ew: "4EW",
          nsNames: "Alex Morgan & Chris Palmer",
          ewNames: "Dana Rivers & Robin Shaw",
        },
        currentResult: "3NTN=",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 2,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "2NS",
          ew: "5EW",
          nsNames: "Sam Carter & Nina Carter",
          ewNames: "Jordan Blake & Mia Fox",
        },
        currentResult: "4HE+1",
        status: "CONFIRMED",
      },
      {
        roundNumber: 3,
        tableNumber: 3,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "3NS",
          ew: "1EW",
          nsNames: "Oliver Reed & Sophie Bell",
          ewNames: "Alex Morgan & Chris Palmer",
        },
        currentResult: null,
        status: null,
      },
      {
        roundNumber: 4,
        tableNumber: 4,
        boardNumber: 7,
        participants: {
          type: "PAIRS",
          ns: "5NS",
          ew: "3EW",
          nsNames: "Jordan Blake & Mia Fox",
          ewNames: "Oliver Reed & Sophie Bell",
        },
        currentResult: "2SXE-2",
        status: "OVERRIDDEN",
      },
    ],
  },
};

export const PairsWithoutNames: Story = {
  args: {
    boardNumber: 3,
    isLoading: false,
    instances: [
      {
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "1NS",
          ew: "2EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "3NTW+1",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 2,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "3NS",
          ew: "4EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "PO",
        status: "CONFIRMED",
      },
      {
        roundNumber: 3,
        tableNumber: 3,
        boardNumber: 3,
        participants: {
          type: "PAIRS",
          ns: "5NS",
          ew: "1EW",
          nsNames: null,
          ewNames: null,
        },
        currentResult: "NP",
        status: "NOT_PLAYED",
      },
    ],
  },
};

export const NoResults: Story = {
  args: {
    boardNumber: 12,
    isLoading: false,
    instances: [],
  },
};

/**
 * A Swiss Teams board with two matches (four teams). The flat per-table rows
 * are grouped into team-match cards (open room at the home team's table, closed
 * room at the opponent's), labelled by team name. The first match is complete
 * in both rooms, so it shows the board's IMP margin; the second has only its
 * open room scored, so its closed room shows "—" and no margin is shown yet.
 * Every room stays tappable.
 */
export const Teams: Story = {
  args: {
    boardNumber: 5,
    isLoading: false,
    instances: [
      // Match 1 — Sharks (table 1) v Owls (table 2): both rooms scored.
      {
        roundNumber: 2,
        tableNumber: 1,
        boardNumber: 5,
        participants: { type: "PAIRS", ns: "A1NS", ew: "A2EW" },
        currentResult: "4HN=",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 2,
        boardNumber: 5,
        participants: { type: "PAIRS", ns: "A2NS", ew: "A1EW" },
        currentResult: "3NTN=",
        status: "CONFIRMED",
      },
      // Match 2 — Eagles (table 3) v Robins (table 4): only the open room is in.
      {
        roundNumber: 2,
        tableNumber: 3,
        boardNumber: 5,
        participants: { type: "PAIRS", ns: "A3NS", ew: "A4EW" },
        currentResult: "2SN+1",
        status: "CONFIRMED",
      },
      {
        roundNumber: 2,
        tableNumber: 4,
        boardNumber: 5,
        participants: { type: "PAIRS", ns: "A4NS", ew: "A3EW" },
        currentResult: null,
        status: null,
      },
    ],
    teamMatches: [
      {
        tables: [1, 2],
        teams: [
          { table: 1, id: "A1NS", name: "Sharks" },
          { table: 2, id: "A2NS", name: "Owls" },
        ],
        margin: 6,
        triangle: false,
      },
      {
        // Only one room scored, so the board isn't comparable yet.
        tables: [3, 4],
        teams: [
          { table: 3, id: "A3NS", name: "Eagles" },
          { table: 4, id: "A4NS", name: "Robins" },
        ],
        margin: null,
        triangle: false,
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    boardNumber: 5,
    isLoading: true,
    instances: [],
  },
};
