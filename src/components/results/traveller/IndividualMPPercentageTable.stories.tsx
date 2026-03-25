import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMPPercentageTable } from "@/components/results/traveller/IndividualMPPercentageTable";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";

const meta: Meta<typeof IndividualMPPercentageTable> = {
  title: "Components/Results/Traveller/IndividualMPPercentageTable",
  component: IndividualMPPercentageTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMPPercentageTable>;

export const Default: Story = {
  args: {
    scoredTraveller: individualMpTraveller,
  },
};
