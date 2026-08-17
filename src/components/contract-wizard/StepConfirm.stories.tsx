import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepConfirm } from "./StepConfirm";

const meta: Meta<typeof StepConfirm> = {
  title: "Components/ContractWizard/StepConfirm",
  component: StepConfirm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
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
    resultValue: 1,
    onSubmit: () => {},
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
    resultValue: 2,
    onSubmit: () => {},
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
    resultValue: 0,
    onSubmit: () => {},
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
    resultValue: 0,
    onSubmit: () => {},
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
    resultValue: 0,
    onSubmit: () => {},
  },
};
