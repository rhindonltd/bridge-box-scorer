import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/components/pages/play/BoardResultsPage";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";
import { scoreCrossIMP, scoreMatchpoints } from "@/model/score-traveller";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof BoardResultsPage> = {
  title: "Pages/Player/BoardResultsPage",
  component: BoardResultsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BoardResultsPage>;

export const IndividualIMP: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualIMPTraveller,
  },
};

export const IndividualMP: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualMpTraveller,
  },
};

export const PairIMP: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: scoreCrossIMP(impBoard1),
  },
};

export const PairMP: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: scoreMatchpoints(mpBoard1),
  },
};
