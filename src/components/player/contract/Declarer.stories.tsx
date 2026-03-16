import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Declarer from "@/components/player/contract/Declarer";
import { fn } from "storybook/test";

const meta: Meta<typeof Declarer> = {
  title: "Player/Contract/Declarer",
  component: Declarer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onDeclarerSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Declarer>;

export const Example: Story = {
  args: {
    declarer: "N",
  },
};
