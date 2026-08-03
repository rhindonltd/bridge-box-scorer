import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepSuit } from "./StepSuit";

const meta: Meta<typeof StepSuit> = {
  title: "Components/Play/ContractWizard/StepSuit",
  component: StepSuit,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof StepSuit>;

export const Level4: Story = {
  args: {
    level: 4,
    onSuitSelected: () => {},
  },
};

export const Level1: Story = {
  args: {
    level: 1,
    onSuitSelected: () => {},
  },
};

export const Level7: Story = {
  args: {
    level: 7,
    onSuitSelected: () => {},
  },
};
