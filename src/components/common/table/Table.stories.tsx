import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Table } from "./Table";
import { TableRow } from "./TableRow";

const meta: Meta<typeof Table> = {
  title: "Components/Common/Table",
  component: Table,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Table>;

export const Default: Story = {
  args: {
    columns: ["Board", "NS", "EW", "Contract", "Result"],
    body: (
      <>
        <TableRow cells={["1", "1", "2", "3NT N", "+1"]} className="" />
        <TableRow cells={["2", "1", "2", "4H S", "="]} className="" />
        <TableRow cells={["3", "1", "2", "2S W", "-1"]} className="" />
      </>
    ),
  },
};

export const SingleColumn: Story = {
  args: {
    columns: ["Name"],
    body: (
      <>
        <TableRow cells={["Alice"]} className="" />
        <TableRow cells={["Bob"]} className="" />
      </>
    ),
  },
};
