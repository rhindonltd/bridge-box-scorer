import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMPTable } from "@/components/results/traveller/PairMPTable";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { score } from "@/model/score-traveller";

const meta: Meta<typeof PairMPTable> = {
  title: "Components/Results/Traveller/PairMPTable",
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
    scoredTraveller: score(mpBoard1, "PAIR_MP"),
  },
};
