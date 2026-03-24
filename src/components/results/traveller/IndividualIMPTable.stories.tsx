import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";

const meta: Meta<typeof IndividualIMPTable> = {
  title: "Components/Results/Traveller/IndividualIMPTable",
  component: IndividualIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualIMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: individualIMPTraveller,
  },
};
