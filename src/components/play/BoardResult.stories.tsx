import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BoardResult } from "./BoardResult";
import { fn } from "storybook/test";

const meta: Meta<typeof BoardResult> = {
  title: "Components/Play/BoardResult",
  component: BoardResult,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    board: 7,
    contract: "4C",
    declarer: "N",
    onSave: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof BoardResult>;

export const Default: Story = {};
