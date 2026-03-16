import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairLeaderboard } from "./PairLeaderboard";
import { RankedPairResultRow } from "@/model/ranks";

// Example data for Storybook
const mpResults = [
  {
    pairId: "101",
    rank: 1,
    totalNs: 120,
    totalEw: 110,
    travellerType: "MP",
    percentage: 65.5,
  },
  {
    pairId: "102",
    rank: 2,
    totalNs: 115,
    totalEw: 105,
    travellerType: "MP",
    percentage: 60.0,
  },
  {
    pairId: "103",
    rank: 3,
    totalNs: 110,
    totalEw: 108,
    travellerType: "MP",
    percentage: 55.0,
  },
] as RankedPairResultRow[];

const impResults = [
  {
    pairId: "201",
    rank: 1,
    totalNs: 120,
    totalEw: 110,
    travellerType: "IMP",
    crossImps: 15.2,
  },
  {
    pairId: "202",
    rank: 2,
    totalNs: 115,
    totalEw: 105,
    travellerType: "IMP",
    crossImps: 12.5,
  },
  {
    pairId: "203",
    rank: 3,
    totalNs: 110,
    totalEw: 108,
    travellerType: "IMP",
    crossImps: 10.0,
  },
] as RankedPairResultRow[];

const meta: Meta<typeof PairLeaderboard> = {
  title: "Bridge/PairLeaderboard",
  component: PairLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairLeaderboard>;

export const MPLeaderboard: Story = {
  args: {
    results: mpResults,
    showPercentage: true,
    showCrossImps: false,
  },
};

export const IMPLeaderboard: Story = {
  args: {
    results: impResults,
    showPercentage: false,
    showCrossImps: true,
  },
};
