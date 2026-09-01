import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ManageMovementPage } from "@/app/game/[gameId]/manage/movement/ManageMovementPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ManageMovementPage> = {
  title: "App/Manage/Game/Movement/ManageMovementPage",
  component: ManageMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    backHref: "/games",
  },
};

export default meta;
type Story = StoryObj<typeof ManageMovementPage>;

export const Default: Story = {
  decorators: [withGame(mockGame)],
};
