import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableCell } from "./TableCell";

const meta: Meta<typeof TableCell> = {
  title: "Components/Common/TableCell",
  component: TableCell,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <table>
        <tbody>
          <tr>
            <Story />
          </tr>
        </tbody>
      </table>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TableCell>;

export const Default: Story = {
  args: {
    value: "4NT",
    className: "",
  },
};

export const WithCustomClass: Story = {
  args: {
    value: "100",
    className: "font-bold text-green-600",
  },
};
