import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PairXIMPTable } from "@/components/results/traveller/PairXIMPTable";
import { pairXimpTraveller } from "@/mocks/fixtures/traveller/pair-ximp";

const meta: Meta<typeof PairXIMPTable> = {
  title: "Components/Results/Traveller/PairXIMPTable",
  component: PairXIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairXIMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: pairXimpTraveller,
  },
};
