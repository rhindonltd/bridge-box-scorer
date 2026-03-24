import type { Meta, StoryObj } from "@storybook/react-vite";
import { scoreMatchpoints } from "@/model/score-traveller";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { PairMP } from "@/components/results/traveller/PairMP";

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
    scoredTraveller: scoreMatchpoints(mpBoard1),
  },
};
