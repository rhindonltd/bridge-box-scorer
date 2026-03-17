import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import SelectMovementTypePage from "@/components/pages/director/SelectMovementTypePage";

const meta: Meta<typeof SelectMovementTypePage> = {
  title: "Pages/Director/Section/SelectMovementTypePage",
  component: SelectMovementTypePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSelectMovement: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectMovementTypePage>;

export const Default: Story = {
  args: {
    title: "Monday PM Pairs",
  },
};
