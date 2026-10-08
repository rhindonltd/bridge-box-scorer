import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepAdjustmentType } from "./StepAdjustmentType";
import { fn } from "storybook/test";

const meta: Meta<typeof StepAdjustmentType> = {
  title: "Components/ContractWizard/StepAdjustmentType",
  component: StepAdjustmentType,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onEnterContract: fn(),
    onAdjustedScore: fn(),
    onWeightedScore: fn(),
    onCancelBoard: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof StepAdjustmentType>;

export const Default: Story = {};
