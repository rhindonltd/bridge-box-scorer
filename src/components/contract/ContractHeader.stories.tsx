import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContractHeader } from "@/components/contract/ContractHeader";
import { withPlay } from "@storybook/decorators/PlayDecorator";

const meta: Meta<typeof ContractHeader> = {
  title: "Components/Contract/ContractHeader",
  component: ContractHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [withPlay({ board: 3 }, { round: 2 })],
};

export default meta;
type Story = StoryObj<typeof ContractHeader>;

export const Default: Story = {
  args: {
    contract: "4♠ by N",
    result: "+1",
  },
};
