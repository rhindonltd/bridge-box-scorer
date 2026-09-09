import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { withGame } from "@storybook/decorators/GameDecorator";
import { SetupGamePage } from "./SetupGamePage";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SetupGamePage> = {
  title: "App/Create/Game/SetupGamePage",
  component: SetupGamePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SetupGamePage>;

export const Default: Story = {};
