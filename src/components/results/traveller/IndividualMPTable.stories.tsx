import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMPTable } from "@/components/results/traveller/IndividualMPTable";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";

const meta: Meta<typeof IndividualMPTable> = {
  title: "Components/Results/Traveller/IndividualMPTable",
  component: IndividualMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: individualMpTraveller,
  },
};
