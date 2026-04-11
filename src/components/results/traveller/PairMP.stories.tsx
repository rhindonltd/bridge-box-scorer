import type { Meta, StoryObj } from "@storybook/react-vite";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { PairMP } from "@/components/results/traveller/PairMP";
import { score } from "@/model/score-traveller";

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
    scoredTraveller: score(mpBoard1, "PAIR_MP"),
  },
};
