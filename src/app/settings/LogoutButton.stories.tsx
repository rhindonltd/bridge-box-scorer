import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogoutButton } from "@/app/settings/LogoutButton";

const meta: Meta<typeof LogoutButton> = {
  title: "App/Settings/LogoutButton",
  component: LogoutButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LogoutButton>;

/** The idle logout button. */
export const Default: Story = {};
