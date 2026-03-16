import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContractHeader } from "@/components/player/contract/ContractHeader";

const meta: Meta<typeof ContractHeader> = {
  title: "Player/Contract/ContractHeader",
  component: ContractHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ContractHeader>;

export const Example: Story = {
  args: {
    board: 3,
    contract: "4♠ by N",
    result: "+1",
  },
};
