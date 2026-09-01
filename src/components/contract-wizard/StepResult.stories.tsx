import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepResult } from "./StepResult";
import { fn } from "storybook/test";

const meta: Meta<typeof StepResult> = {
  title: "Components/ContractWizard/StepResult",
  component: StepResult,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onResultComplete: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof StepResult>;

export const Level1: Story = {
  args: {
    level: 1,
  },
};

export const Level4: Story = {
  args: {
    level: 4,
  },
};

export const Level7: Story = {
  args: {
    level: 7,
  },
};
