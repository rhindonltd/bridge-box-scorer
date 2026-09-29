import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { SwissTeamsDrawControl } from "@/app/game/[gameId]/manage/movement/SwissTeamsDrawControl";
// Imported with the full relative path + extension so the mocked() calls below
// are the same module instance registered for mocking in .storybook/preview.tsx.
import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
} from "../../../../../lib/swiss-service";

const previewAck = {
  roundNumber: 2,
  teams: 4,
  matches: [
    { a: 1, b: 3 },
    { a: 2, b: 4 },
  ],
  byeTeamId: null,
  triangle: null,
  named: {
    matches: [
      { a: { teamId: 1, name: "Sharks" }, b: { teamId: 3, name: "Owls" } },
      { a: { teamId: 2, name: "Dragons" }, b: { teamId: 4, name: "Eagles" } },
    ],
    bye: null,
    triangle: null,
  },
  standings: [
    { id: 1, name: "1st place team", total: 30, rank: 1, tied: false },
    { id: 3, name: "2nd place team", total: 25, rank: 2, tied: false },
    { id: 2, name: "3rd place team", total: 20, rank: 3, tied: false },
    { id: 4, name: "4th place team", total: 15, rank: 4, tied: false },
  ],
  repeatMatchKeys: [],
  advisoryInputs: { teams: 4, playedOpponents: [] },
  hadUnavoidableRepeat: false,
};

const meta: Meta<typeof SwissTeamsDrawControl> = {
  title: "App/Manage/Game/Movement/SwissTeamsDrawControl",
  component: SwissTeamsDrawControl,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { gameId: "game-123", section: "A" },
};

export default meta;
type Story = StoryObj<typeof SwissTeamsDrawControl>;

/** Waiting for the current round: the button is disabled with an explanation. */
export const WaitingForResults: Story = {
  args: { allResultsIn: false },
};

/** All results in — the draw button is enabled and idle. */
export const ReadyToDraw: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissTeamsRound).mockResolvedValue(previewAck);
  },
};

/** Clicking Draw opens the review page showing the team matches. */
export const PreviewsTheDraw: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissTeamsRound).mockResolvedValue(previewAck);
    mocked(commitNextSwissTeamsRound).mockResolvedValue({ roundNumber: 2 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() => canvas.getByTestId("draw-confirm"));
    await expect(canvas.getByText("Sharks")).toBeVisible();
  },
};

/** Accepting the draw (OK) commits it and returns with a confirmation. */
export const CommitsOnOk: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissTeamsRound).mockResolvedValue(previewAck);
    mocked(commitNextSwissTeamsRound).mockResolvedValue({ roundNumber: 2 });
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
 * The director edits the draw before committing: tapping Owls then Dragons
 * swaps their places, so the matches become 1v2 and 3v4, and OK commits exactly
 * that edited arrangement.
 */
export const EditsThenCommits: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissTeamsRound).mockResolvedValue(previewAck);
    mocked(commitNextSwissTeamsRound).mockResolvedValue({ roundNumber: 2 });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("draw-next-round"));
    await waitFor(() => canvas.getByTestId("draw-confirm"));

    // Swap Owls (team 3) with Dragons (team 2).
    await userEvent.click(canvas.getByRole("button", { name: /Owls/ }));
    await userEvent.click(canvas.getByRole("button", { name: /Dragons/ }));
    await userEvent.click(canvas.getByTestId("draw-confirm"));

    await waitFor(() =>
      expect(mocked(commitNextSwissTeamsRound)).toHaveBeenCalledWith(
        "game-123",
        "A",
        [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        null,
        null,
      ),
    );
  },
};

/** The preview is rejected — the reason is shown inline as an error. */
export const PreviewRejected: Story = {
  args: { allResultsIn: true },
  beforeEach: () => {
    mocked(previewNextSwissTeamsRound).mockRejectedValue(
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
