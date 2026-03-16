import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SubmitButton from "@/components/player/contract/SubmitButton";
import { fn } from "storybook/test";

const meta: Meta<typeof SubmitButton> = {
  title: "Player/Contract/SubmitButton",
  component: SubmitButton,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SubmitButton>;

export const Example: Story = {};
