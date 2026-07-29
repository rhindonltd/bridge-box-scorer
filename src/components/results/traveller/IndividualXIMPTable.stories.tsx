import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IndividualXIMPTable } from "@/components/results/traveller/IndividualXIMPTable";
import { individualXimpTraveller } from "@/mocks/fixtures/traveller/individual-ximp";

const meta: Meta<typeof IndividualXIMPTable> = {
  title: "Components/Results/Traveller/IndividualXIMPTable",
  component: IndividualXIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof IndividualXIMPTable>;

export const Default: Story = {
  args: {
    scoredTraveller: individualXimpTraveller,
  },
};
