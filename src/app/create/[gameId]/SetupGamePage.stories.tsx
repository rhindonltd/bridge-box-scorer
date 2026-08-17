import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SetupGamePage } from "./SetupGamePage";
import { withGame } from "@storybook/decorators/GameDecorator";

const pairsGame4Tables = {
  id: 1,
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  gameId: "abc123",
  sessionName: "1",
  sectionName: "A",
  eventDate: new Date().toISOString(),
  tables: 4,
  leadCardRequired: true,
  status: "CREATED" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof SetupGamePage> = {
  title: "App/Create/Game/SetupGamePage",
  component: SetupGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/create",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SetupGamePage>;

export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
