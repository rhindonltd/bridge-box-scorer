import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MainMenuPage } from "@/app/MainMenuPage";

const meta: Meta<typeof MainMenuPage> = {
  title: "App/MainMenuPage",
  component: MainMenuPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MainMenuPage>;

export const Default: Story = {};
