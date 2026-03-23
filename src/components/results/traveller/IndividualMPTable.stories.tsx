import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMPTable } from "@/components/results/traveller/IndividualMPTable";

const meta: Meta<typeof IndividualMPTable> = {
  title: "Components/Results/Traveller/IndividualMPTable",
  component: IndividualMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: {
      type: "INDIVIDUAL_MP",
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
          maxMatchPoints: 8,
          nsMatchPoints: 6,
          ewMatchPoints: 2,
        },
        {
          outcome: "NP",
          score: null,
          nPlayerId: "5",
          sPlayerId: "6",
          wPlayerId: "7",
          ePlayerId: "8",
          maxMatchPoints: 0,
          nsMatchPoints: 0,
          ewMatchPoints: 0,
        },
        {
          outcome: "PO",
          score: 0,
          nPlayerId: "9",
          sPlayerId: "10",
          wPlayerId: "11",
          ePlayerId: "12",
          maxMatchPoints: 6,
          nsMatchPoints: 3,
          ewMatchPoints: 3,
        },
      ],
    },
  },
};
