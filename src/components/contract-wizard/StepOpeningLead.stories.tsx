import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { StepOpeningLead } from "./StepOpeningLead";

const meta: Meta<typeof StepOpeningLead> = {
  title: "Components/Play/ContractWizard/StepOpeningLead",
  component: StepOpeningLead,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLeadComplete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-screen flex flex-col">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StepOpeningLead>;

export const Default: Story = {};
