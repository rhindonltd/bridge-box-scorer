import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { UpdateAdminKeyForm } from "@/app/settings/admin-key/UpdateAdminKeyForm";

const meta: Meta<typeof UpdateAdminKeyForm> = {
  title: "App/Settings/AdminKey/UpdateAdminKeyForm",
  component: UpdateAdminKeyForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    newKey: "",
    confirmKey: "",
    saving: false,
    message: null,
    onNewKeyChange: fn(),
    onConfirmKeyChange: fn(),
    onSave: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof UpdateAdminKeyForm>;

/** Empty form. */
export const Empty: Story = {};

/** Both fields entered, ready to submit. */
export const Filled: Story = {
  args: {
    newKey: "supersecret",
    confirmKey: "supersecret",
  },
};

/** A save is in flight. */
export const Saving: Story = {
  args: {
    newKey: "supersecret",
    confirmKey: "supersecret",
    saving: true,
  },
};

/** Successful update confirmation. */
export const Updated: Story = {
  args: {
    message: "✅ Admin key updated",
  },
};

/** Validation error (keys do not match). */
export const Mismatch: Story = {
  args: {
    newKey: "abcd",
    confirmKey: "abce",
    message: "Keys do not match",
  },
};
