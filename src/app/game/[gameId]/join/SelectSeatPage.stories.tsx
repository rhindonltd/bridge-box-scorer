import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectSeatPage } from "@/app/game/[gameId]/join/SelectSeatPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SelectSeatPage> = {
  title: "App/Join/Game/Player/SelectSeatPage",
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

export const Pairs: Story = {
  decorators: [withGame(mockGame)],
};
