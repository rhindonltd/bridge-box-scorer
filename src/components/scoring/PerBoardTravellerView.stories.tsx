import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PerBoardTravellerView } from "./PerBoardTravellerView";
import { mpPerBoardPlugin } from "@/scoring/plugins/per-board/mp";
import { ximpPerBoardPlugin } from "@/scoring/plugins/per-board/x-imp";
import { impPerBoardPlugin } from "@/scoring/plugins/per-board/imp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";

const meta: Meta<typeof PerBoardTravellerView> = {
  title: "Components/Scoring/PerBoardTravellerView",
  component: PerBoardTravellerView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PerBoardTravellerView>;

export const MP: Story = {
  args: {
    plugin: mpPerBoardPlugin,
    scored: mpPerBoardPlugin.score(mpBoard1),
  },
};

/**
 * The pair matching `highlightAssignmentId` has its traveller row highlighted.
 * In `mpBoard1`, pair "3" plays as NS, so the row showing NS "3" is emphasised.
 */
export const MPHighlighted: Story = {
  args: {
    plugin: mpPerBoardPlugin,
    scored: mpPerBoardPlugin.score(mpBoard1),
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
    plugin: ximpPerBoardPlugin,
    scored: ximpPerBoardPlugin.score(impBoard1),
  },
};

export const IMP: Story = {
  args: {
    plugin: impPerBoardPlugin,
    scored: impPerBoardPlugin.score(mpBoard1),
  },
};
