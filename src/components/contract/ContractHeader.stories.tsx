import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContractHeader } from "@/components/contract/ContractHeader";
import { withBoard } from "@storybook/decorators/BoardDecorator";

const meta: Meta<typeof ContractHeader> = {
  title: "Components/Contract/ContractHeader",
  component: ContractHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [withBoard(3)],
};

export default meta;
type Story = StoryObj<typeof ContractHeader>;

export const Default: Story = {
  args: {
    contract: "4♠ by N",
    result: "+1",
  },
};
