import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";

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
    scoredTraveller: {
      type: "INDIVIDUAL_IMP",
      board: 10,
      section: crypto.randomUUID(),
      lines: [
        {
          outcome: "4SS=",
          score: 620,
          nPlayerId: "1",
          sPlayerId: "2",
          wPlayerId: "3",
          ePlayerId: "4",
          nsCrossImps: 6.23,
          ewCrossImps: 2.12,
        },
        {
          outcome: "NP",
          score: null,
          nPlayerId: "5",
          sPlayerId: "6",
          wPlayerId: "7",
          ePlayerId: "8",
          nsCrossImps: 0,
          ewCrossImps: 0,
        },
        {
          outcome: "PO",
          score: 0,
          nPlayerId: "9",
          sPlayerId: "10",
          wPlayerId: "11",
          ePlayerId: "12",
          nsCrossImps: 3.98,
          ewCrossImps: 3.98,
        },
      ],
    },
  },
};
