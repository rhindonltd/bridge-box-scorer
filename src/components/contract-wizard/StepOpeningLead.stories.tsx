import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { StepOpeningLead } from "./StepOpeningLead";

const meta: Meta<typeof StepOpeningLead> = {
  title: "Components/ContractWizard/StepOpeningLead",
  component: StepOpeningLead,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLeadComplete: fn(),
  }
};

export default meta;

type Story = StoryObj<typeof StepOpeningLead>;

export const Default: Story = {};
