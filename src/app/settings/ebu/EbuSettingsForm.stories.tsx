import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { EbuSettingsForm } from "@/app/settings/ebu/EbuSettingsForm";

const meta: Meta<typeof EbuSettingsForm> = {
  title: "App/Settings/Ebu/EbuSettingsForm",
  component: EbuSettingsForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    ebuNumber: "",
    password: "",
    configured: false,
    saving: false,
    message: null,
    onEbuNumberChange: fn(),
    onPasswordChange: fn(),
    onSave: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EbuSettingsForm>;

/** First-time setup: nothing configured, password required. */
export const Unconfigured: Story = {};

/**
 * Already configured: the EBU number is prefilled and the password may be left
 * blank to keep the stored one (note the hint under the password field).
 */
export const Configured: Story = {
  args: {
    ebuNumber: "1234567",
    configured: true,
  },
};

/** A save is in flight. */
export const Saving: Story = {
  args: {
    ebuNumber: "1234567",
    configured: true,
    saving: true,
  },
};

/** Successful save confirmation. */
export const Saved: Story = {
  args: {
    ebuNumber: "1234567",
    configured: true,
    message: "✅ EBU settings saved",
  },
};

/** Validation / server error. */
export const Error: Story = {
  args: {
    ebuNumber: "",
    message: "EBU number is required",
  },
};
