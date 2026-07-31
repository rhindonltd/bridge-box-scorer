import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableHead } from "./TableHead";

const meta: Meta<typeof TableHead> = {
  title: "Components/Common/TableHead",
  component: TableHead,
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

type Story = StoryObj<typeof TableHead>;

export const Default: Story = {
  args: {
    columns: ["Board", "NS", "EW", "Contract", "Result"],
  },
};

export const FewColumns: Story = {
  args: {
    columns: ["Pair", "Score"],
  },
};
