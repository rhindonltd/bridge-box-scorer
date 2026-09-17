import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UpdateAdminKeyPage } from "@/app/settings/admin-key/UpdateAdminKeyPage";

/**
 * Container story for the update-admin-key screen. Unlike the other settings
 * pages this container does no data fetching on mount (it only POSTs on save),
 * so it renders directly without MSW handlers. The prop-driven states live in
 * `UpdateAdminKeyForm` stories.
 */
const meta: Meta<typeof UpdateAdminKeyPage> = {
  title: "App/Settings/AdminKey/UpdateAdminKeyPage",
  component: UpdateAdminKeyPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/settings/admin-key" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UpdateAdminKeyPage>;

/** The empty update-key form. */
export const Default: Story = {};
