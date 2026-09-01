import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepConfirm } from "./StepConfirm";
import { fn } from "storybook/test";

const meta: Meta<typeof StepConfirm> = {
  title: "Components/ContractWizard/StepConfirm",
  component: StepConfirm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: { onSubmit: fn() },
};

export default meta;

type Story = StoryObj<typeof StepConfirm>;

export const NormalContract: Story = {
  args: {
    level: 4,
    suit: "S",
    declarer: "N",
    dbl: "",
    specialOutcome: null,
    leadSuit: null,
    leadRank: null,
    resultMode: "made",
    resultValue: 1
  },
};

export const Doubled: Story = {
  args: {
    level: 3,
    suit: "NT",
    declarer: "E",
    dbl: "X",
    specialOutcome: null,
    leadSuit: null,
    leadRank: null,
    resultMode: "down",
    resultValue: 2
  },
};

export const WithLead: Story = {
  args: {
    level: 4,
    suit: "H",
    declarer: "S",
    dbl: "",
    specialOutcome: null,
    leadSuit: "S",
    leadRank: "A",
    resultMode: "made",
    resultValue: 0
  },
};

export const PassOut: Story = {
  args: {
    level: null,
    suit: null,
    declarer: null,
    dbl: "",
    specialOutcome: "PO",
    leadSuit: null,
    leadRank: null,
    resultMode: "made",
    resultValue: 0
  },
};

export const NotPlayed: Story = {
  args: {
    level: null,
    suit: null,
    declarer: null,
    dbl: "",
    specialOutcome: "NP",
    leadSuit: null,
    leadRank: null,
    resultMode: "made",
    resultValue: 0
  },
};
