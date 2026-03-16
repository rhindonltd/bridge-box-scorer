import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Double from "@/components/player/contract/Double";
import { fn } from "storybook/test";

const meta: Meta<typeof Double> = {
  title: "Player/Contract/Double",
  component: Double,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onDblSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Double>;

export const Example: Story = {
  args: {
    dbl: "X",
  },
};
