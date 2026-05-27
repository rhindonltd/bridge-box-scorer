import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withGame } from "@storybook/decorators/GameDecorator";
import { EnterPairPlayerNamesPage } from "@/components/pages/join/pairs/EnterPairPlayerNamesPage";
import { fn } from "storybook/test";

const meta: Meta<typeof EnterPairPlayerNamesPage> = {
  title: "Pages/JoinGame/EnterPairPlayerNamesPage",
  component: EnterPairPlayerNamesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmitPair: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EnterPairPlayerNamesPage>;

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
      type: "PAIR",
      tableNumber: 3,
      direction: "NS",
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
      type: "PAIR",
      tableNumber: 3,
      direction: "NS",
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
      type: "PAIR",
      tableNumber: 3,
      direction: "EW",
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
      type: "PAIR",
      tableNumber: 3,
      direction: "EW",
    },
  },
};
