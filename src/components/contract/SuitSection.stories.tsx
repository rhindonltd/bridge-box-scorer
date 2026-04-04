import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SuitSection from "@/components/contract/SuitSection";
import { fn } from "storybook/test";

const meta: Meta<typeof SuitSection> = {
  title: "Components/Contract/SuitSection",
  component: SuitSection,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSuitSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SuitSection>;

export const Default: Story = {
  args: {
    suit: "D",
  },
};
