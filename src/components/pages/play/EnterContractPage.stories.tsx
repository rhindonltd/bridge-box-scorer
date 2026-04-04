import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/play/EnterContractPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withPlay } from "@storybook/decorators/PlayDecorator";

const meta: Meta<typeof EnterContractPage> = {
  title: "Pages/Play/EnterContractPage",
  component: EnterContractPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterContractPage>;

export const Default: Story = {
  decorators: [
    withPlay({ board: 2 }, { round: 3 }),
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
    table: 2,
    round: 1,
    roundBoards: [1, 2, 3],
  },
};

export const SessionAndSection: Story = {
  decorators: [
    withPlay({ board: 2 }, { round: 3 }),
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "Section A",
      },
      null,
    ),
  ],
  args: {
    table: 2,
    round: 1,
    roundBoards: [1, 2, 3],
  },
};
