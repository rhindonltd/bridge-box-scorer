import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ManageGameMenuPage> = {
  title: "App/Manage/Game/Menu/DirectorMenuPage",
  component: ManageGameMenuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSetUpGameClick: fn(),
    onSectionsClick: fn(),
    onTravellersClick: fn(),
    onMovementClick: fn(),
    onShareDirectorAccessClick: fn(),
    onDownloadUsebioClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ManageGameMenuPage>;

export const Default: Story = {};
