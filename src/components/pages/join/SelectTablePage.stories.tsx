import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectTablePage } from "@/components/pages/join/SelectTablePage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof SelectTablePage> = {
  title: "Pages/JoinGame/SelectTablePage",
  component: SelectTablePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    selectTable: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectTablePage>;

export const Default: Story = {
  decorators: [
    withGame(
      {
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
      },
      null,
    ),
  ],
};
