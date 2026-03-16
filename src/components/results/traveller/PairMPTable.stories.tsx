import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMPTable } from "@/components/results/traveller/PairMPTable";
import { scoreMatchpoints } from "@/model/score-traveller";
import { PairMPTraveller } from "@/model/traveller";

const meta: Meta<typeof PairMPTable> = {
  title: "Results/Traveller/PairMPTable",
  component: PairMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: scoreMatchpoints({
      type: "PAIR_MP",
      board: 1,
      section: "",
      lines: [
        {
          nsPairId: "1",
          ewPairId: "2",
          outcome: "3DE-1",
        },
        {
          nsPairId: "3",
          ewPairId: "4",
          outcome: "3CW-2",
        },
        {
          nsPairId: "5",
          ewPairId: "6",
          outcome: "4DXN-3",
        },
        {
          nsPairId: "7",
          ewPairId: "8",
          outcome: "4SW-1",
        },
        {
          nsPairId: "9",
          ewPairId: "10",
          outcome: "2DN-1",
        },
        {
          nsPairId: "11",
          ewPairId: "12",
          outcome: "2DN-2",
        },
        {
          nsPairId: "13",
          ewPairId: "14",
          outcome: "2NTE=",
        },
        {
          nsPairId: "15",
          ewPairId: "16",
          outcome: "3SW+1",
        },
      ],
    } as PairMPTraveller),
  },
};
