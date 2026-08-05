import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/play/EnterContractPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withPlay } from "@storybook/decorators/PlayDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

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
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
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
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    table: 2,
    round: 1,
    roundBoards: [1, 2, 3],
  },
};
