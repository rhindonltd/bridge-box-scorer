import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/player/EnterContractPage";
import { withGame } from "@storybook/decorators/GameDecorator";

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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    table: 2,
    round: 1,
    board: 2,
    roundBoards: [1, 2, 3],
  },
};

export const SessionAndSection: Story = {
  decorators: [
    withGame({
      eventName: "Monday PM Pairs",
      sessionName: "Session 1",
      sectionName: "Section A",
    }),
  ],
  args: {
    table: 2,
    round: 1,
    board: 2,
    roundBoards: [1, 2, 3],
  },
};
