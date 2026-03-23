import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairMPLeaderboard } from "./PairMPLeaderboard";
import {
  calculateOverallIMPResults,
  calculateOverallMPResults,
} from "@/model/score-pair";
import {
  board1,
  board10,
  board11,
  board12,
  board13,
  board14,
  board15,
  board16,
  board17,
  board18,
  board19,
  board2,
  board20,
  board21,
  board3,
  board4,
  board5,
  board6,
  board7,
  board8,
  board9,
  players,
} from "@/mocks/fixtures/mp-travellers";
import { scoreMatchpoints } from "@/model/score-traveller";

const meta: Meta<typeof PairMPLeaderboard> = {
  title: "Components/Results/Overall/PairMPLeaderboard",
  component: PairMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPLeaderboard>;

export const Default: Story = {
  args: {
    results: calculateOverallMPResults(players, [
      scoreMatchpoints(board1),
      scoreMatchpoints(board2),
      scoreMatchpoints(board3),
      scoreMatchpoints(board4),
      scoreMatchpoints(board5),
      scoreMatchpoints(board6),
      scoreMatchpoints(board7),
      scoreMatchpoints(board8),
      scoreMatchpoints(board9),
      scoreMatchpoints(board10),
      scoreMatchpoints(board11),
      scoreMatchpoints(board12),
      scoreMatchpoints(board13),
      scoreMatchpoints(board14),
      scoreMatchpoints(board15),
      scoreMatchpoints(board16),
      scoreMatchpoints(board17),
      scoreMatchpoints(board18),
      scoreMatchpoints(board19),
      scoreMatchpoints(board20),
      scoreMatchpoints(board21),
    ]),
  },
};
