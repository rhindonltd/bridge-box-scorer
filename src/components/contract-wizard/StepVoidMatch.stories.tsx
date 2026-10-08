import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepVoidMatch } from "./StepVoidMatch";
import { fn } from "storybook/test";

const meta: Meta<typeof StepVoidMatch> = {
  title: "Components/ContractWizard/StepVoidMatch",
  component: StepVoidMatch,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: { onSubmit: fn() },
};

export default meta;

type Story = StoryObj<typeof StepVoidMatch>;

export const Default: Story = {};
