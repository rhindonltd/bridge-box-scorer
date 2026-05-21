import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnterPlayerNamesPage } from "@/components/pages/join/EnterPlayerNamesPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof EnterPlayerNamesPage> = {
  title: "Pages/JoinGame/EnterPlayerNamesPage",
  component: EnterPlayerNamesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterPlayerNamesPage>;

export const NS: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      eventType: null,
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
    table: 3,
    direction: "NS",
  },
};

export const NSWithSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      eventType: null,
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
    table: 3,
    direction: "NS",
  },
};

export const EW: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      eventType: null,
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
    table: 3,
    direction: "EW",
  },
};

export const EWWithSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      eventType: null,
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
    table: 3,
    direction: "EW",
  },
};
