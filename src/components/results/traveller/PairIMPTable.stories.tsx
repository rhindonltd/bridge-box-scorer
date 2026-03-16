import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";

const meta: Meta<typeof PairIMPTable> = {
  title: "Results/Traveller/PairIMPTable",
  component: PairIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairIMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: {
      type: "PAIR_IMP",
      board: 10,
      section: crypto.randomUUID(),
      lines: [
        {
          outcome: "4SS=",
          score: 620,
          nsPairId: "1",
          ewPairId: "2",
          nsCrossImps: 6.23,
          ewCrossImps: 2.12,
        },
        {
          outcome: "NP",
          score: null,
          nsPairId: "3",
          ewPairId: "4",
          nsCrossImps: 0,
          ewCrossImps: 0,
        },
        {
          outcome: "PO",
          score: 0,
          nsPairId: "5",
          ewPairId: "6",
          nsCrossImps: 3.98,
          ewCrossImps: 3.98,
        },
      ],
    },
  },
};
