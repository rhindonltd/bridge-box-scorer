import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { scoreCrossIMP } from "@/model/score-traveller";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";

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
    scoredTraveller: scoreCrossIMP(impBoard1),
  },
};
