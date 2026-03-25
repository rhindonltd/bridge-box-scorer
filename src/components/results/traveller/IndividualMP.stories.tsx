import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualMP } from "@/components/results/traveller/IndividualMP";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";

const meta: Meta<typeof IndividualMP> = {
  title: "Components/Results/Traveller/IndividualMP",
  component: IndividualMP,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualMP>;

export const Default: Story = {
  args: {
    scoredTraveller: individualMpTraveller,
  },
};
