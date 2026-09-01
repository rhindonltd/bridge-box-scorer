import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { withGame } from "@storybook/decorators/GameDecorator";
import { SetupGamePage } from "./SetupGamePage";
import { fn } from "storybook/test";
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
  args: {
    onTimerClick: fn(),
    onTravellersClick: fn(),
    onMovementClick: fn(),
    onDownloadUsebioClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SetupGamePage>;

export const Default: Story = {};
