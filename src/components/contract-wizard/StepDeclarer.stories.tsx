import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { StepDeclarer } from "./StepDeclarer";

const meta: Meta<typeof StepDeclarer> = {
  title: "Components/ContractWizard/StepDeclarer",
  component: StepDeclarer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onDeclarerSelected: fn(),
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

type Story = StoryObj<typeof StepDeclarer>;

export const FourSpades: Story = {
  args: {
    level: 4,
    suit: "S",
  },
};

export const ThreeNoTrumps: Story = {
  args: {
    level: 3,
    suit: "NT",
  },
};

export const SevenHearts: Story = {
  args: {
    level: 7,
    suit: "H",
  },
};
