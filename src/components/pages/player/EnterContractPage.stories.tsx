import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/player/EnterContractPage";

const meta: Meta<typeof EnterContractPage> = {
  title: "Pages/Player/EnterContract",
  component: EnterContractPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterContractPage>;

export const Default: Story = {
  args: {
    eventName: 'Monday PM Pairs',
    table: 2,
    round: 1,
    board: 2,
    roundBoards: [1, 2, 3],
  },
};

export const SessionAndSection: Story = {
    args: {
        eventName: 'Monday PM Pairs',
        sessionName: 'Session 1',
        sectionName: 'Section A',
        table: 2,
        round: 1,
        board: 2,
        roundBoards: [1, 2, 3],
    },
};
