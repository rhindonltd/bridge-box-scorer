import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SubstitutionsPage } from "@/app/game/[gameId]/manage/substitutions/SubstitutionsPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import type { SubstitutionSeat } from "@/db/games/queries/find-substitution-seats";

const meta: Meta<typeof SubstitutionsPage> = {
  title: "App/Manage/Game/SubstitutionsPage",
  component: SubstitutionsPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    onBack: fn(),
    onSave: fn(async () => {}),
  },
};

export default meta;
type Story = StoryObj<typeof SubstitutionsPage>;

const seat = (overrides: Partial<SubstitutionSeat> = {}): SubstitutionSeat => ({
  seat: "A1NS",
  pair: "Carol May & Dan Fox",
  playedCount: 14,
  missedCount: 10,
  split: false,
  occupants: [
    {
      id: 2,
      pair: "Carol May & Dan Fox",
      boardCount: 14,
      eligible: true,
      isArrivalAnchor: true,
      isMainPair: true,
    },
    {
      id: 1,
      pair: "Alice Smith & Bob Jones",
      boardCount: 10,
      eligible: true,
      isArrivalAnchor: false,
      isMainPair: false,
    },
  ],
  ...overrides,
});

/** One substituted seat, defaulting to one merged line, both eligible. */
export const OneSeat: Story = {
  args: {
    substitutions: [seat()],
  },
};

/** A mix: a merged line, a split seat with an ineligible earlier pair. */
export const SeveralSeats: Story = {
  args: {
    substitutions: [
      seat(),
      seat({
        seat: "A3EW",
        pair: "Eve Adams & Frank Lee",
        playedCount: 20,
        missedCount: 4,
        split: true,
        occupants: [
          {
            id: 4,
            pair: "Eve Adams & Frank Lee",
            boardCount: 20,
            eligible: true,
            isArrivalAnchor: true,
            isMainPair: true,
          },
          {
            id: 3,
            pair: "Gina Hall & Ian King",
            boardCount: 4,
            eligible: false,
            isArrivalAnchor: false,
            isMainPair: false,
          },
        ],
      }),
    ],
  },
};

/**
 * A teams event: the same merged seat, but the NGS/Masterpoint warning is
 * suppressed (teams credit goes to the team, not the pair).
 */
export const TeamsNoWarning: Story = {
  args: {
    isPairs: false,
    substitutions: [seat()],
  },
};

/** A teams event: read-only list, no toggles and no Save button. */
export const TeamsReadOnly: Story = {
  args: {
    isTeams: true,
    isPairs: false,
    substitutions: [seat()],
  },
};

/** No substitutions — the empty state (the menu item would normally be hidden). */
export const Empty: Story = {
  args: {
    substitutions: [],
  },
};
