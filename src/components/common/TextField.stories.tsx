import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import TextField from "./TextField";

const meta: Meta<typeof TextField> = {
  title: "Components/Common/TextField",
  component: TextField,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: {
    label: "Label",
    value: "Value",
  },
};
