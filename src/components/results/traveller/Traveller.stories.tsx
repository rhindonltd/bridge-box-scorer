import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Traveller } from "@/components/results/traveller/Traveller";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { score } from "@/scoring/traveller/score-traveller";

const meta: Meta<typeof Traveller> = {
  title: "Components/Results/Traveller/Traveller",
  component: Traveller,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Traveller>;

export const PairIMP: Story = {
  args: {
    scoredTraveller: score(impBoard1, "XIMP"),
  },
};

export const PairMP: Story = {
  args: {
    scoredTraveller: score(mpBoard1, "MP"),
  },
};
