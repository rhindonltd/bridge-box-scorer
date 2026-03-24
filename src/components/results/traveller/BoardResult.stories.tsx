import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoardResult } from "@/components/results/traveller/BoardResult";

const meta: Meta<typeof BoardResult> = {
  title: "Components/Results/Traveller/BoardResult",
  component: BoardResult,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof BoardResult>;

export const BlackSuitContract: Story = {
  args: {
    boardOutcome: "4SN+1",
  },
};

export const RedSuitContract: Story = {
  args: {
    boardOutcome: "4HN+1",
  },
};

export const NoTrumpsContract: Story = {
  args: {
    boardOutcome: "3NTN+1",
  },
};

export const PassOut: Story = {
  args: {
    boardOutcome: "PO",
  },
};

export const NotPlayed: Story = {
  args: {
    boardOutcome: "NP",
  },
};
