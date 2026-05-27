import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnterIndividualPlayerNamesPage } from "@/components/pages/join/individual/EnterIndividualPlayerNamesPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof EnterIndividualPlayerNamesPage> = {
  title: "Pages/JoinGame/EnterIndividualPlayerNamesPage",
  component: EnterIndividualPlayerNamesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterIndividualPlayerNamesPage>;

export const NS: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    seat: {
      type: "INDIVIDUAL",
      tableNumber: 3,
      direction: "N",
    },
  },
};

export const NSWithSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    seat: {
      type: "INDIVIDUAL",
      tableNumber: 3,
      direction: "N",
    },
  },
};

export const EW: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    seat: {
      type: "INDIVIDUAL",
      tableNumber: 3,
      direction: "N",
    },
  },
};

export const EWWithSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    seat: {
      type: "INDIVIDUAL",
      tableNumber: 3,
      direction: "N",
    },
  },
};
