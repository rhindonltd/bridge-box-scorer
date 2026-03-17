import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Suit from "@/components/player/contract/Suit";
import { fn } from "storybook/test";

const meta: Meta<typeof Suit> = {
  title: "Components/Player/Contract/Suit",
  component: Suit,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSuitSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Suit>;

export const Default: Story = {
  args: {
    suit: "♦",
  },
};
