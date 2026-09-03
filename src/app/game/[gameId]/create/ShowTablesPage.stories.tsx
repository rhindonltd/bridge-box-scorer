import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { pairsGame4Tables } from "@/mocks/fixtures/game";

const meta: Meta<typeof ShowTablesPage> = {
  title: "App/Create/Game/ShowTablesPage",
  component: ShowTablesPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ShowTablesPage>;

export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
