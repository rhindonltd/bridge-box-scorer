import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectTablePage } from "@/components/pages/joingame/SelectTablePage";
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
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
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
