import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SettingsMenuPage } from "@/app/settings/SettingsMenuPage";

const meta: Meta<typeof SettingsMenuPage> = {
  title: "App/Settings/SettingsMenuPage",
  component: SettingsMenuPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SettingsMenuPage>;

/** The settings landing menu with its navigation links and logout. */
export const Default: Story = {};
