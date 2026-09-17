import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MainMenuPage } from "@/app/MainMenuPage";

const meta: Meta<typeof MainMenuPage> = {
  title: "App/MainMenuPage",
  component: MainMenuPage,
  parameters: {
    layout: "fullscreen",
    // Uses next/link for its menu buttons and the settings cog.
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MainMenuPage>;

/**
 * The landing menu. This screen is intentionally single-state — it is a static
 * set of navigation links with no props or data — so there is one story.
 */
export const Default: Story = {};
