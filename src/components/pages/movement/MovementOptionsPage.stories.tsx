import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import MovementOptionsPage from "@/components/pages/movement/MovementOptionsPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof MovementOptionsPage> = {
  title: "Pages/Movement/MovementOptionsPage",
  component: MovementOptionsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmit: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof MovementOptionsPage>;

export const Default: Story = {
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
    tables: 5,
  },
};

export const EventWithSessionAndSection: Story = {
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
    tables: 5,
  },
};
