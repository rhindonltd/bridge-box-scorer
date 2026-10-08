import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepPairsVoid } from "./StepPairsVoid";
import { fn } from "storybook/test";

const meta: Meta<typeof StepPairsVoid> = {
  title: "Components/ContractWizard/StepPairsVoid",
  component: StepPairsVoid,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: { onSubmit: fn() },
};

export default meta;

type Story = StoryObj<typeof StepPairsVoid>;

export const Default: Story = {};
