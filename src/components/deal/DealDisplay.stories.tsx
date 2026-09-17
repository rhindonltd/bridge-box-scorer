import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DealDisplay } from "./DealDisplay";
import type { Deal } from "@/model/common";

/** A full valid deal (N=spades, E=hearts, S=diamonds, W=clubs). */
const fullSuitsDeal: Deal = {
  N: ["SA", "SK", "SQ", "SJ", "ST", "S9", "S8", "S7", "S6", "S5", "S4", "S3", "S2"],
  E: ["HA", "HK", "HQ", "HJ", "HT", "H9", "H8", "H7", "H6", "H5", "H4", "H3", "H2"],
  S: ["DA", "DK", "DQ", "DJ", "DT", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2"],
  W: ["CA", "CK", "CQ", "CJ", "CT", "C9", "C8", "C7", "C6", "C5", "C4", "C3", "C2"],
};

/** A more realistic mixed deal, with a void in North's diamonds. */
const mixedDeal: Deal = {
  N: ["SA", "SK", "SQ", "SJ", "ST", "S9", "HA", "HK", "HQ", "HJ", "CA", "CK", "CQ"],
  E: ["S8", "S7", "S6", "HT", "H9", "H8", "H7", "H6", "H5", "CJ", "CT", "C9", "C8"],
  S: ["S5", "S4", "S3", "S2", "H4", "H3", "H2", "DA", "DK", "DQ", "DJ", "DT", "D9"],
  W: ["D8", "D7", "D6", "D5", "D4", "D3", "D2", "C7", "C6", "C5", "C4", "C3", "C2"],
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
