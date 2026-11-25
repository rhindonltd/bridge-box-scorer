import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PerBoardTravellerView } from "./PerBoardTravellerView";
import { scoreBoard, type ScoredBoard } from "@/modules/scoring";
import { travellerViews } from "@/modules/results-views";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";

const mpScored = scoreBoard(mpBoard1, "MP");
const ximpScored = scoreBoard(impBoard1, "XIMP");
const impScored = scoreBoard(mpBoard1, "IMP");

const meta: Meta<typeof PerBoardTravellerView<ScoredBoard>> = {
  title: "Components/Scoring/PerBoardTravellerView",
  component: PerBoardTravellerView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PerBoardTravellerView<ScoredBoard>>;

export const MP: Story = {
  args: {
    views: travellerViews(mpScored),
    scored: mpScored,
  },
};

/**
 * The pair matching `highlightAssignmentId` has its traveller row highlighted.
 * In `mpBoard1`, pair "3" plays as NS, so the row showing NS "3" is emphasised.
 */
export const MPHighlighted: Story = {
  args: {
    views: travellerViews(mpScored),
    scored: mpScored,
    highlightAssignmentId: "3",
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("table");

    const highlightedRows =
      canvasElement.querySelectorAll<HTMLTableRowElement>("tr.bg-blue-100");
    expect(highlightedRows).toHaveLength(1);
    expect(highlightedRows[0].cells[0]).toHaveTextContent("3");

    const striped = canvasElement.querySelectorAll(
      "tbody tr.even\\:bg-gray-200",
    );
    expect(striped).toHaveLength(0);
  },
};

export const XIMP: Story = {
  args: {
    views: travellerViews(ximpScored),
    scored: ximpScored,
  },
};

export const IMP: Story = {
  args: {
    views: travellerViews(impScored),
    scored: impScored,
  },
};
