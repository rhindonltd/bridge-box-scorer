import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import SelectField from "./SelectField";

const meta: Meta<typeof SelectField> = {
  title: "Common/SelectField",
  component: SelectField,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectField>;

export const Default: Story = {
  args: {
    label: "Label",
    value: "Value 1",
    options: ["Value 1", "Value 2", "Value 3"],
  },
};
