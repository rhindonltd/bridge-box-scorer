import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PairMP } from "@/components/results/traveller/PairMP";
import { pairMpTraveller } from "@/mocks/fixtures/traveller/pair-mp";

const meta: Meta<typeof PairMP> = {
  title: "Components/Results/Traveller/PairMP",
  component: PairMP,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMP>;

export const Default: Story = {
  args: {
    scoredTraveller: pairMpTraveller,
  },
};
