import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairIMPLeaderboard } from "./PairIMPLeaderboard";
import { calculateOverallIMPResults } from "@/model/score-pair";
import {
  impBoard1,
  board10,
  board11,
  board12,
  board13,
  board14,
  board2,
  board3,
  board4,
  board5,
  board6,
  board7,
  board8,
  board9,
  players,
} from "@/mocks/fixtures/ximp-travellers";
import { scoreCrossIMP } from "@/model/score-traveller";

const meta: Meta<typeof PairIMPLeaderboard> = {
  title: "Components/Results/Overall/PairIMPLeaderboard",
  component: PairIMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairIMPLeaderboard>;

export const Default: Story = {
  args: {
    results: calculateOverallIMPResults(players, [
      scoreCrossIMP(impBoard1),
      scoreCrossIMP(board2),
      scoreCrossIMP(board3),
      scoreCrossIMP(board4),
      scoreCrossIMP(board5),
      scoreCrossIMP(board6),
      scoreCrossIMP(board7),
      scoreCrossIMP(board8),
      scoreCrossIMP(board9),
      scoreCrossIMP(board10),
      scoreCrossIMP(board11),
      scoreCrossIMP(board12),
      scoreCrossIMP(board13),
      scoreCrossIMP(board14),
    ]),
  },
};
