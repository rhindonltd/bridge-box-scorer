import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MainMenuPage } from "@/app/MainMenuPage";

const meta: Meta<typeof MainMenuPage> = {
  title: "App/MainMenuPage",
  component: MainMenuPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onCreateNewGame: fn(),
    onJoinGame: fn(),
    onManageGames: fn(),
    onRoomDisplay: fn(),
    onOpenSettings: fn()
  },
};

export default meta;
type Story = StoryObj<typeof MainMenuPage>;

export const Default: Story = {};
