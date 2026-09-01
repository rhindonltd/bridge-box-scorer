import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DeleteGamePage } from "@/app/game/[gameId]/manage/delete-game/DeleteGamePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof DeleteGamePage> = {
  title: "App/Manage/Game/DeleteGame/DeleteGamePage",
  component: DeleteGamePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onGameDeleted: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DeleteGamePage>;

export const Default: Story = {
  decorators: [withGame(mockGame)],
};
