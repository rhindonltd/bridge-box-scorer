import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DealDisplay } from "./DealDisplay";
import type { Deal } from "@/model/common";

/** A full valid deal (N=spades, E=hearts, S=diamonds, W=clubs). */
const fullSuitsDeal: Deal = {
  N: ["AS", "KS", "QS", "JS", "TS", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"],
  E: ["AH", "KH", "QH", "JH", "TH", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"],
  S: ["AD", "KD", "QD", "JD", "TD", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"],
  W: ["AC", "KC", "QC", "JC", "TC", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"],
};

/** A more realistic mixed deal, with a void in North's diamonds. */
const mixedDeal: Deal = {
  N: ["AS", "KS", "QS", "JS", "TS", "9S", "AH", "KH", "QH", "JH", "AC", "KC", "QC"],
  E: ["8S", "7S", "6S", "TH", "9H", "8H", "7H", "6H", "5H", "JC", "TC", "9C", "8C"],
  S: ["5S", "4S", "3S", "2S", "4H", "3H", "2H", "AD", "KD", "QD", "JD", "TD", "9D"],
  W: ["8D", "7D", "6D", "5D", "4D", "3D", "2D", "7C", "6C", "5C", "4C", "3C", "2C"],
};

const meta: Meta<typeof DealDisplay> = {
  title: "Components/Deal/DealDisplay",
  component: DealDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DealDisplay>;

/** Board 1: North is the dealer. */
export const Board1: Story = {
  args: {
    boardNumber: 1,
    deal: fullSuitsDeal,
  },
};

/** Board 2: East is the dealer. */
export const Board2Dealer: Story = {
  args: {
    boardNumber: 2,
    deal: mixedDeal,
  },
};

/** A deal with a void suit (North holds no diamonds — shown as a dash). */
export const WithVoid: Story = {
  args: {
    boardNumber: 3,
    deal: mixedDeal,
  },
};

/** No deal entered: renders nothing. */
export const NoDeal: Story = {
  args: {
    boardNumber: 1,
    deal: null,
  },
};
