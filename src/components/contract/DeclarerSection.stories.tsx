import { Meta, StoryObj } from "@storybook/nextjs-vite";
import DeclarerSection from "@/components/contract/DeclarerSection";
import { fn } from "storybook/test";

const meta: Meta<typeof DeclarerSection> = {
  title: "Components/Contract/DeclarerSection",
  component: DeclarerSection,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onDeclarerSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DeclarerSection>;

export const Default: Story = {
  args: {
    declarer: "N",
  },
};
