import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Traveller } from "@/components/traveller/Traveller";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { score } from "@/scoring/traveller/score-traveller";

const meta: Meta<typeof Traveller> = {
  title: "Components/Traveller/Traveller",
  component: Traveller,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Traveller>;

export const PairIMP: Story = {
  args: {
    scoredTraveller: score(impBoard1, "XIMP"),
  },
};

export const PairMP: Story = {
  args: {
    scoredTraveller: score(mpBoard1, "MP"),
  },
};

/**
 * The pair matching `highlightAssignmentId` has its traveller row highlighted.
 * In `mpBoard1`, pair "3" plays as NS, so the row showing NS "3" is emphasised.
 */
export const PairMPHighlighted: Story = {
  args: {
    scoredTraveller: score(mpBoard1, "MP"),
    highlightAssignmentId: "3",
  },
  play: async ({ canvasElement }) => {
    // Wait for the table to render.
    await within(canvasElement).findByRole("table");

    // Exactly one row is highlighted.
    const highlightedRows =
      canvasElement.querySelectorAll<HTMLTableRowElement>("tr.bg-blue-100");
    expect(highlightedRows).toHaveLength(1);

    // The highlighted row is the one for pair "3" (its NS cell shows "3").
    const highlightedRow = highlightedRows[0];
    expect(highlightedRow.cells[0]).toHaveTextContent("3");

    // Zebra striping is turned off while a row is highlighted, so no other
    // row carries the striped background class.
    const striped = canvasElement.querySelectorAll(
      "tbody tr.even\\:bg-gray-200",
    );
    expect(striped).toHaveLength(0);
  },
};
