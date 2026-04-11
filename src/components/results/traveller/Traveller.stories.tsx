import type { Meta, StoryObj } from "@storybook/react-vite";
import { Traveller } from "@/components/results/traveller/Traveller";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { score } from "@/model/score-traveller";

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

export const IndividualIMP: Story = {
  args: {
    scoredTraveller: individualIMPTraveller,
  },
};

export const IndividualMP: Story = {
  args: {
    scoredTraveller: individualMpTraveller,
  },
};

export const PairIMP: Story = {
  args: {
    scoredTraveller: score(impBoard1, "PAIR_XIMP"),
  },
};

export const PairMP: Story = {
  args: {
    scoredTraveller: score(mpBoard1, "PAIR_MP"),
  },
};
