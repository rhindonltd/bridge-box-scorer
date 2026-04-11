import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardResultsPage } from "@/components/pages/play/BoardResultsPage";
import { individualIMPTraveller } from "@/mocks/fixtures/traveller/individual-imp";
import { individualMpTraveller } from "@/mocks/fixtures/traveller/individual-mp";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import { withGame } from "@storybook/decorators/GameDecorator";
import { score } from "@/model/score-traveller";

const meta: Meta<typeof BoardResultsPage> = {
  title: "Pages/Play/BoardResultsPage",
  component: BoardResultsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BoardResultsPage>;

export const IndividualXIMP: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualIMPTraveller,
  },
};

export const IndividualMP: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: individualMpTraveller,
  },
};

export const PairXIMP: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(impBoard1, "PAIR_XIMP"),
  },
};

export const PairMP: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: score(mpBoard1, "PAIR_MP"),
  },
};
