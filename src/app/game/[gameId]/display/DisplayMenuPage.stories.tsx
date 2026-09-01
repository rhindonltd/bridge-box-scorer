import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisplayMenuPage } from "@/app/game/[gameId]/display/DisplayMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { pairsGame4Tables } from "@/mocks/fixtures/game";

const meta: Meta<typeof DisplayMenuPage> = {
  title: "App/Display/Game/Menu/DisplayMenuPage",
  component: DisplayMenuPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayMenuPage>;

export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
