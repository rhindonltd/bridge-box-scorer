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
        sessionName: "",
        sectionName: "",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        createdAt: new Date().toISOString(),
      },
      null,
    ),
  ],
  args: {
    tables: 8,
    assigned: [
      {
        table: 4,
        direction: "NS",
      },
      {
        table: 6,
        direction: "NS",
      },
      {
        table: 6,
        direction: "EW",
      },
    ],
  },
};
