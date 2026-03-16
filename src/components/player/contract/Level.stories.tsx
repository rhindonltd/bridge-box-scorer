import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Level from "@/components/player/contract/Level";
import { fn } from "storybook/test";

const meta: Meta<typeof Level> = {
  title: "Player/Contract/Level",
  component: Level,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLevelSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Level>;

export const Example: Story = {
  args: {
    level: 2,
  },
};
