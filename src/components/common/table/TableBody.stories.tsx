import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableBody } from "./TableBody";
import { TableRow } from "./TableRow";

const meta: Meta<typeof TableBody> = {
  title: "Components/Common/TableBody",
  component: TableBody,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <table>
        <Story />
      </table>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TableBody>;

export const Default: Story = {
  args: {
    body: (
      <>
        <TableRow cells={["1", "Alice", "100"]} className="" />
        <TableRow cells={["2", "Bob", "90"]} className="" />
      </>
    ),
  },
};
