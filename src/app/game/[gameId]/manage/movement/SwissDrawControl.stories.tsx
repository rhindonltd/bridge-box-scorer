import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { SwissDrawControl } from "@/app/game/[gameId]/manage/movement/SwissDrawControl";
// Imported with the full relative path + extension so the mocked() calls below
// are the same module instance registered for mocking in .storybook/preview.tsx.
import { drawNextSwissRound } from "../../../../../lib/swiss-service";

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
 * control explains why. The director must get every result in (including any
 * adjusted scores) before the next round can be drawn.
 */
export const WaitingForResults: Story = {
  args: { allResultsIn: false },
};

/**
 * All results are in — the draw button is enabled and idle, ready for the
 * director to draw the next round.
 */
export const ReadyToDraw: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });
  },
};

/**
 * A clean draw: the next round is drawn with no advisories, and the control
 * confirms the drawn round number.
 */
export const DrawnCleanly: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() =>
      expect(canvas.getByTestId("draw-notice")).toHaveTextContent(
        "Round 2 drawn.",
      ),
    );
  },
};

/**
 * A draw with every advisory the server can raise: a bye (sit-out pair), an
 * unavoidable repeat pairing, and two stationary pairs forced to meet. The
 * director is told so they can hand-adjust the seating if they wish.
 */
export const DrawnWithAdvisories: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 3,
      sitOutPairId: 5,
      hadUnavoidableRepeat: true,
      hadStationaryConflict: true,
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() => canvas.getByTestId("draw-notice"));
    const notice = canvas.getByTestId("draw-notice");
    await expect(notice).toHaveTextContent("Round 3 drawn.");
    await expect(notice).toHaveTextContent("bye");
    await expect(notice).toHaveTextContent("repeat pairing");
    await expect(notice).toHaveTextContent("stationary pairs");
  },
};

/**
 * The server rejects the draw (e.g. the event is already complete, or the
 * round isn't fully scored). The reason is shown inline as an error.
 */
export const DrawRejected: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(drawNextSwissRound).mockRejectedValue(
      new Error("All rounds have already been drawn."),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() =>
      expect(canvas.getByTestId("draw-error")).toHaveTextContent(
        "All rounds have already been drawn.",
      ),
    );
  },
};
