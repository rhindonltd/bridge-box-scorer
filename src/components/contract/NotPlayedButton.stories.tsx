import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import NotPlayedButton from "@/components/contract/NotPlayedButton";

const meta: Meta<typeof NotPlayedButton> = {
  title: "Components/Contract/NotPlayedButton",
  component: NotPlayedButton,
  parameters: {
    layout: "centered",
  },
  tags: ["fullscreen"],
  args: {
    onNotPlayed: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof NotPlayedButton>;

export const Default: Story = {};
