import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import MovementOptionsPage from "@/components/pages/director/MovementOptionsPage";

const meta: Meta<typeof MovementOptionsPage> = {
  title: "Pages/Director/MovementOptionsPage",
  component: MovementOptionsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmit: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof MovementOptionsPage>;

export const Default: Story = {
  args: {
    tables: 5,
  },
};
