import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Result from "@/components/player/contract/Result";
import { fn } from "storybook/test";

const meta: Meta<typeof Result> = {
  title: "Player/Contract/Result",
  component: Result,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAdjustResult: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Result>;

export const Example: Story = {
  args: {
    result: "+1",
  },
};
