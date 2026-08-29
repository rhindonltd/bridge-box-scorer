import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepLevel } from "./StepLevel";
import { fn } from "storybook/test";

const meta: Meta<typeof StepLevel> = {
  title: "Components/ContractWizard/StepLevel",
  component: StepLevel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLevelSelected: fn(),
    onSpecialOutcome: fn(),
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

type Story = StoryObj<typeof StepLevel>;

export const Default: Story = {};
