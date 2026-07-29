import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PairMPTable } from "@/components/results/traveller/PairMPTable";
import { pairMpTraveller } from "@/mocks/fixtures/traveller/pair-mp";

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
    scoredTraveller: pairMpTraveller,
  },
};
