import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToggleButton } from "./ToggleButton";

const meta: Meta<typeof ToggleButton> = {
  title: "Common/ToggleButton",
  component: ToggleButton,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ToggleButton>;

export const Default: Story = {
  args: {
    children: "Button",
    active: false,
  },
};

export const Active: Story = {
  args: {
    children: "Selected",
    active: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: "Full Width",
    fullWidth: true,
  },
};
