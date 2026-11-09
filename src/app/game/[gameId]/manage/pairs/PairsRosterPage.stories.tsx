import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PairsRosterPage } from "@/app/game/[gameId]/manage/pairs/PairsRosterPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import type { RosterEntry } from "@/db/games/queries/find-game-roster";

const meta: Meta<typeof PairsRosterPage> = {
  title: "App/Manage/Game/PairsRosterPage",
  component: PairsRosterPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    onBack: fn(),
    onSaveSubstitution: fn(async () => {}),
    onSetAbsenceTreatment: fn(async () => {}),
    onWithdraw: fn(async () => {}),
    renderReinstatePanel: () => (
      <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 text-center font-mono text-2xl tracking-widest">
        ABCD
      </div>
    ),
    renderMoveDevicePanel: () => (
      <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 text-center font-mono text-2xl tracking-widest">
        WXYZ
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof PairsRosterPage>;

const active = (seat: string, pair: string): RosterEntry => ({
  seat,
  pair,
  status: "ACTIVE",
});

/** The everyday case: every pair active. A single section shows no pills. */
export const AllActive: Story = {
  args: {
    roster: [
      active("A1NS", "Ann Smith & Bob Jones"),
      active("A1EW", "Carol May & Dan Fox"),
      active("A2NS", "Eve Adams & Frank Lee"),
    ],
  },
};

/**
 * A two-section game: pairs are grouped into per-section containers, with
 * All / Section A / Section B pills at the top (as on the table-setup screen).
 */
export const MultipleSections: Story = {
  args: {
    roster: [
      active("A1NS", "Ann Smith & Bob Jones"),
      active("A1EW", "Carol May & Dan Fox"),
      active("A2NS", "Eve Adams & Frank Lee"),
      active("B1NS", "Grace Hill & Hugh Ives"),
      active("B1EW", "Ivy Jones & Jack King"),
      active("B2EW", "Kay Lamb & Leo Mann"),
    ],
  },
};

/** A mix of statuses — the attention-needing pairs sort to the top. */
export const MixedStatuses: Story = {
  args: {
    roster: [
      {
        seat: "A4EW",
        pair: null,
        status: "NOT_ARRIVED",
        absence: {
          seat: "A4EW",
          kind: "EMPTY",
          pair: null,
          round: null,
          treatment: "AVERAGE",
          missedBoards: 2,
        },
      },
      {
        seat: "A2NS",
        pair: "Lou Late & Lee Late",
        status: "LATE",
        absence: {
          seat: "A2NS",
          kind: "LATE",
          pair: "Lou Late & Lee Late",
          round: 3,
          treatment: "AVERAGE",
          missedBoards: 4,
        },
      },
      {
        seat: "A3EW",
        pair: "Wyn Gone & Wes Gone",
        status: "WITHDRAWN",
        absence: {
          seat: "A3EW",
          kind: "WITHDRAWN",
          pair: "Wyn Gone & Wes Gone",
          round: 5,
          treatment: "REMOVED",
          missedBoards: 6,
        },
      },
      {
        seat: "A5NS",
        pair: "Carol May & Dan Fox",
        status: "SUBSTITUTED",
        substitution: {
          seat: "A5NS",
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
              pair: "Early One & Early Two",
              boardCount: 10,
              eligible: true,
              isArrivalAnchor: false,
              isMainPair: false,
            },
          ],
        },
      },
      active("A1NS", "Ann Smith & Bob Jones"),
    ],
  },
};
