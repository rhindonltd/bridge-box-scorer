import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";

const meta: Meta<typeof TableRoundPairBoardInfo> = {
  title: "Components/Common/TableRoundPairBoardInfo",
  component: TableRoundPairBoardInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TableRoundPairBoardInfo>;

export const Table: Story = {
  args: {
    pair: "1NS",
    table: 1,
  },
};

export const TableAndRound: Story = {
  args: {
    pair: "1NS",
    table: 1,
    round: 2,
  },
};

export const TableRoundAndBoard: Story = {
  args: {
    pair: "1NS",
    table: 1,
    round: 2,
    board: 3,
  },
};
