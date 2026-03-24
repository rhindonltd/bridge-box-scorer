import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Toggle } from "@/components/common/Toggle";

const meta: Meta<typeof Toggle> = {
  title: "Components/Common/Toggle",
  component: Toggle,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSwitch: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof Toggle>;

export const ToggleOn: Story = {
  args: {
    value: true,
    offLabel: "OFF",
    onLabel: "ON",
  },
};

export const ToggleOff: Story = {
  args: {
    value: false,
    offLabel: "OFF",
    onLabel: "ON",
  },
};
