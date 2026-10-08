import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepTeamsRemoval } from "./StepTeamsRemoval";
import { fn } from "storybook/test";

const meta: Meta<typeof StepTeamsRemoval> = {
  title: "Components/ContractWizard/StepTeamsRemoval",
  component: StepTeamsRemoval,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: { onSubmit: fn() },
};

export default meta;

type Story = StoryObj<typeof StepTeamsRemoval>;

export const Default: Story = {};
