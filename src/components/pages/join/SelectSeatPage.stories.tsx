import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectSeatPage } from "@/components/pages/join/SelectSeatPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof SelectSeatPage> = {
  title: "Pages/JoinGame/SelectTablePage",
  component: SelectSeatPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectSeatPage>;

export const Individual: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "INDIVIDUAL",
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
};

export const Pairs: Story = {
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
};
