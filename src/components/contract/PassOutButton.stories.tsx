import { Meta, StoryObj } from "@storybook/nextjs-vite";
import PassOutButton from "@/components/contract/PassOutButton";
import { fn } from "storybook/test";

const meta: Meta<typeof PassOutButton> = {
  title: "Components/Contract/PassOutButton",
  component: PassOutButton,
  parameters: {
    layout: "centered",
  },
  tags: ["fullscreen"],
  args: {
    onPassOut: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PassOutButton>;

export const Default: Story = {};
