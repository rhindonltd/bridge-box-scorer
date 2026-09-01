import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ScoreTableView } from "./ScoreTableView";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";

const meta: Meta<typeof ScoreTableView> = {
  title: "Components/Scoring/ScoreTableView",
  component: ScoreTableView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ScoreTableView>;

const table: ScoreTable = {
  columns: [
    { label: "NS" },
    { label: "EW" },
    { label: "Contract" },
    { label: "NS Score" },
    { label: "NS IMP" },
    { label: "EW IMP" },
  ],
  rows: [
    {
      cells: [
        textCell("1"),
        textCell("2"),
        contractCell("3NTN="),
        numberCell(400),
        numberCell(5.5, 2),
        numberCell(-5.5, 2),
      ],
      highlightIds: ["1", "2"],
    },
    {
      cells: [
        textCell("3"),
        textCell("4"),
        contractCell("4HS+1"),
        numberCell(450),
        numberCell(-5.5, 2),
        numberCell(5.5, 2),
      ],
      highlightIds: ["3", "4"],
    },
  ],
};

/** Renders every cell kind: text, contract (with suit glyphs) and numbers. */
export const AllCellKinds: Story = {
  args: { table },
};

/**
 * When `highlightAssignmentId` matches a row's `highlightIds`, exactly that row
 * is highlighted and zebra striping is disabled.
 */
export const Highlighted: Story = {
  args: { table, highlightAssignmentId: "3" },
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
