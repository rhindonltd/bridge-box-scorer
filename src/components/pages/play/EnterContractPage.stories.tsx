import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/play/EnterContractPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withPlay } from "@storybook/decorators/PlayDecorator";

const meta: Meta<typeof EnterContractPage> = {
  title: "Pages/Player/EnterContractPage",
  component: EnterContractPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterContractPage>;

export const Default: Story = {
  decorators: [withPlay(2, 3), withGame({ eventName: "Monday PM Pairs" })],
  args: {
    table: 2,
    round: 1,
    roundBoards: [1, 2, 3],
  },
};

export const SessionAndSection: Story = {
  decorators: [
    withPlay(2, 3),
    withGame({
      eventName: "Monday PM Pairs",
      sessionName: "Session 1",
      sectionName: "Section A",
    }),
  ],
  args: {
    table: 2,
    round: 1,
    roundBoards: [1, 2, 3],
  },
};
