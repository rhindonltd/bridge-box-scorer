import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { SwissDrawControl } from "@/app/game/[gameId]/manage/movement/SwissDrawControl";
// Imported with the full relative path + extension so the mocked() calls below
// are the same module instance registered for mocking in .storybook/preview.tsx.
import {
  previewNextSwissRound,
  commitNextSwissRound,
} from "../../../../../lib/swiss-service";
import type { SwissPreviewAck } from "@/lib/swiss-service";

/** A minimal full Player row for story fixtures. */
let nextPlayerId = 1;
function p(firstName: string, lastName: string) {
  return { id: nextPlayerId++, firstName, lastName, nationalId: null };
}

const previewAck: SwissPreviewAck = {
  roundNumber: 2,
  tables: 2,
  seating: [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ],
  sitOutPairId: null,
  named: {
    tables: [
      {
        tableNumber: 1,
        nsPairId: 1,
        ewPairId: 3,
        players: {
          N: p("Alice", "North"),
          S: p("Bob", "South"),
          E: p("Carol", "East"),
          W: p("Dave", "West"),
        },
      },
      {
        tableNumber: 2,
        nsPairId: 2,
        ewPairId: 4,
        players: {
          N: p("Erin", "North"),
          S: p("Frank", "South"),
          E: p("Gina", "East"),
          W: p("Hugo", "West"),
        },
      },
    ],
    bye: null,
  },
  advisoryInputs: {
    tables: 2,
    playedOpponents: [],
    hadBye: [],
    directionCounts: [],
    stationary: [],
  },
  hadUnavoidableRepeat: false,
  hadStationaryConflict: false,
};

const meta: Meta<typeof SwissDrawControl> = {
  title: "App/Manage/Game/Movement/SwissDrawControl",
  component: SwissDrawControl,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { gameId: "game-123", section: "A" },
};

export default meta;
type Story = StoryObj<typeof SwissDrawControl>;

/**
 * Waiting for the current round to finish: the button is disabled and the
 * control explains why.
 */
export const WaitingForResults: Story = {
  args: { allResultsIn: false },
};

/**
 * All results are in — the draw button is enabled and idle, ready to preview
 * the next round.
 */
export const ReadyToDraw: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissRound).mockResolvedValue(previewAck);
  },
};

/**
 * Clicking Draw opens the review page showing the proposed seating with player
 * names, before anything is committed.
 */
export const PreviewsTheDraw: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissRound).mockResolvedValue(previewAck);
    mocked(commitNextSwissRound).mockResolvedValue({ roundNumber: 2 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() => canvas.getByTestId("draw-confirm"));
    await expect(canvas.getByText("Alice North / Bob South")).toBeVisible();
  },
};

/**
 * Accepting the draw (OK) commits the shown seating and returns to the control
 * with a confirmation.
 */
export const CommitsOnOk: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissRound).mockResolvedValue(previewAck);
    mocked(commitNextSwissRound).mockResolvedValue({ roundNumber: 2 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() => canvas.getByTestId("draw-confirm"));
    await userEvent.click(canvas.getByTestId("draw-confirm"));
    await waitFor(() =>
      expect(canvas.getByTestId("draw-notice")).toHaveTextContent(
        "Round 2 drawn.",
      ),
    );
  },
};

/**
 * The preview is rejected (e.g. the round isn't fully scored) — the reason is
 * shown inline as an error.
 */
export const PreviewRejected: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissRound).mockRejectedValue(
      new Error("All results for the current round must be in first."),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() =>
      expect(canvas.getByTestId("draw-error")).toHaveTextContent(
        "current round",
      ),
    );
  },
};
