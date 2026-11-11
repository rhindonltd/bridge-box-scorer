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
    clubName: "",
    ebuNumber: "",
    password: "",
    configured: false,
    saving: false,
    message: null,
    onClubNameChange: fn(),
    onEbuNumberChange: fn(),
    onPasswordChange: fn(),
    onSave: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EbuSettingsForm>;

/** First-time setup: nothing set yet. The password is optional. */
export const Unconfigured: Story = {};

/**
 * Club details set but no EBU login: the results files can be made, and the
 * password can be added later to submit to the EBU.
 */
export const ClubOnly: Story = {
  args: {
    clubName: "Anytown Bridge Club",
    ebuNumber: "1234567",
  },
};

/**
 * Fully configured: the club details are prefilled and the password may be left
 * blank to keep the stored one (note the hint under the password field).
 */
export const Configured: Story = {
  args: {
    clubName: "Anytown Bridge Club",
    ebuNumber: "1234567",
    configured: true,
  },
};

/** A save is in flight. */
export const Saving: Story = {
  args: {
    clubName: "Anytown Bridge Club",
    ebuNumber: "1234567",
    configured: true,
    saving: true,
  },
};

/** Successful save confirmation. */
export const Saved: Story = {
  args: {
    clubName: "Anytown Bridge Club",
    ebuNumber: "1234567",
    configured: true,
    message: "✅ EBU settings saved",
  },
};

/** Validation / server error. */
export const Error: Story = {
  args: {
    message: "Club name is required",
  },
};
