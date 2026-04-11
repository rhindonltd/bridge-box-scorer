import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMPPercentageTable } from "@/components/results/traveller/PairMPPercentageTable";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { score } from "@/model/score-traveller";

const meta: Meta<typeof PairMPPercentageTable> = {
  title: "Components/Results/Traveller/PairMPPercentageTable",
  component: PairMPPercentageTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPPercentageTable>;

export const Default: Story = {
  args: {
    scoredTraveller: score(mpBoard1, "PAIR_MP"),
  },
};
