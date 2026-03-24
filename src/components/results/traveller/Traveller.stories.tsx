import type { Meta, StoryObj } from "@storybook/react-vite";
import { Traveller } from "@/components/results/traveller/Traveller";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";
import { scoreCrossIMP, scoreMatchpoints } from "@/model/score-traveller";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";

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
    scoredTraveller: scoreCrossIMP(impBoard1),
  },
};

export const PairMP: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(mpBoard1),
  },
};
