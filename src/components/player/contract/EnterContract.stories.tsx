import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContract from "@/components/player/contract/EnterContract";

const meta: Meta<typeof EnterContract> = {
  title: "Player/Contract/EnterContract",
  component: EnterContract,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterContract>;

export const Default: Story = {};
