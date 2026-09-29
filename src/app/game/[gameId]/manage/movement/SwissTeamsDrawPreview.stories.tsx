import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SwissTeamsDrawPreview } from "@/app/game/[gameId]/manage/movement/SwissTeamsDrawPreview";
import type { SwissTeamsPreviewAck } from "@/lib/swiss-service";

const basePreview: SwissTeamsPreviewAck = {
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
  hadUnavoidableRepeat: false,
};

const meta: Meta<typeof SwissTeamsDrawPreview> = {
  title: "App/Manage/Game/Movement/SwissTeamsDrawPreview",
  component: SwissTeamsDrawPreview,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    preview: basePreview,
    committing: false,
    error: null,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SwissTeamsDrawPreview>;

/** A clean even-field draw ready to accept. */
export const CleanDraw: Story = {};

/** Committing: the OK button shows its in-flight label. */
export const Committing: Story = {
  args: { committing: true },
};

/** A draw that repeats an earlier match — advisory shown. */
export const WithRepeatAdvisory: Story = {
  args: {
    preview: { ...basePreview, hadUnavoidableRepeat: true },
  },
};

/** An odd field resolved with a bye: the sitting-out team is shown. */
export const WithBye: Story = {
  args: {
    preview: {
      ...basePreview,
      teams: 5,
      matches: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      byeTeamId: 5,
      named: {
        matches: [
          { a: { teamId: 1, name: "Sharks" }, b: { teamId: 2, name: "Dragons" } },
          { a: { teamId: 3, name: "Owls" }, b: { teamId: 4, name: "Eagles" } },
        ],
        bye: { teamId: 5, name: "Robins" },
        triangle: null,
      },
    },
  },
};

/** An odd field resolved with a three-way triangle. */
export const WithTriangle: Story = {
  args: {
    preview: {
      ...basePreview,
      teams: 5,
      matches: [{ a: 4, b: 5 }],
      triangle: { a: 1, b: 2, c: 3 },
      named: {
        matches: [
          { a: { teamId: 4, name: "Eagles" }, b: { teamId: 5, name: "Robins" } },
        ],
        bye: null,
        triangle: {
          a: { teamId: 1, name: "Sharks" },
          b: { teamId: 2, name: "Dragons" },
          c: { teamId: 3, name: "Owls" },
        },
      },
    },
  },
};

/** A failed commit surfaces an inline error. */
export const CommitError: Story = {
  args: { error: "Could not save the draw." },
};
