import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import SelectMovementPage from "@/components/pages/movement/SelectMovementPage";

const meta: Meta<typeof SelectMovementPage> = {
  title: "Pages/Movement/SelectMovementPage",
  component: SelectMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onConfirm: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectMovementPage>;

export const Default: Story = {};
