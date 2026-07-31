import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableRow } from "./TableRow";

const meta: Meta<typeof TableRow> = {
  title: "Components/Common/TableRow",
  component: TableRow,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <table>
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TableRow>;

export const Default: Story = {
  args: {
    cells: ["1", "NS", "4H", "+1", "420"],
    className: "",
  },
};

export const Highlighted: Story = {
  args: {
    cells: ["2", "EW", "3NT", "=", "400"],
    className: "bg-yellow-100",
  },
};
