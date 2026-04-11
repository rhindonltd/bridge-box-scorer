import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { score } from "@/model/score-traveller";

const meta: Meta<typeof PairIMPTable> = {
  title: "Components/Results/Traveller/PairIMPTable",
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
    scoredTraveller: score(impBoard1, `PAIR_XIMP`),
  },
};
