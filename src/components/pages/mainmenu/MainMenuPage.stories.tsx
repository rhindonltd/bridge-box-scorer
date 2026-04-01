import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MainMenuPage } from "./MainMenuPage";

const meta: Meta<typeof MainMenuPage> = {
  title: "Pages/MainMenu/MainMenuPage",
  component: MainMenuPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onCreateNewGame: fn(),
    onJoinGame: fn(),
    onManagePastGames: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MainMenuPage>;

export const Default: Story = {};
