import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OpeningLead } from "./OpeningLead";
import { fn } from "storybook/test";

const meta: Meta<typeof OpeningLead> = {
  title: "Components/Play/OpeningLead",
  component: OpeningLead,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSave: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof OpeningLead>;

export const Default: Story = {};
