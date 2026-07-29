import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PairMPPercentageTable } from "@/components/results/traveller/PairMPPercentageTable";
import { pairMpTraveller } from "@/mocks/fixtures/traveller/pair-mp";

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
    scoredTraveller: pairMpTraveller,
  },
};
