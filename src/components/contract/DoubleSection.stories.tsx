import { Meta, StoryObj } from "@storybook/nextjs-vite";
import DoubleSection from "@/components/contract/DoubleSection";
import { fn } from "storybook/test";

const meta: Meta<typeof DoubleSection> = {
  title: "Components/Contract/DoubleSection",
  component: DoubleSection,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onDblSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DoubleSection>;

export const Default: Story = {
  args: {
    dbl: "X",
  },
};
