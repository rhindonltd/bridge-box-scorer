import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Header from "@/components/player/contract/Header";

const meta: Meta<typeof Header> = {
  title: "Player/Contract/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Example: Story = {
  args: {
    contract: "4S",
    resultText: "+1",
  },
};
