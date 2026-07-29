import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

const individualImpTraveller: ScoredTravellerOfType<"INDIVIDUAL_IMP"> = {
  type: "INDIVIDUAL_IMP",
  board: 4,
  lines: [
    {
      outcome: "4HN=",
      nId: "1",
      sId: "2",
      eId: "3",
      wId: "4",
      score: 620,
      nsImps: 10,
      ewImps: 0,
    },
    {
      outcome: "3NTN+1",
      nId: "5",
      sId: "6",
      eId: "7",
      wId: "8",
      score: 430,
      nsImps: 5,
      ewImps: 0,
    },
    {
      outcome: "4HN-1",
      nId: "9",
      sId: "10",
      eId: "11",
      wId: "12",
      score: -100,
      nsImps: 0,
      ewImps: 3,
    },
  ],
};

const meta: Meta<typeof IndividualIMPTable> = {
  title: "Components/Results/Traveller/IndividualIMPTable",
  component: IndividualIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualIMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: individualImpTraveller,
  },
};
