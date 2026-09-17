import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ClubSettingsForm } from "@/app/settings/club/ClubSettingsForm";

const meta: Meta<typeof ClubSettingsForm> = {
  title: "App/Settings/Club/ClubSettingsForm",
  component: ClubSettingsForm,
  parameters: {
    layout: "fullscreen",
    // Opt this component into enforced a11y checks (the global default is
    // "todo", i.e. report-only). New/verified-clean components are migrated to
    // "error" one at a time so accessibility regressions here fail CI, without
    // forcing every legacy story to pass at once.
  },
  tags: ["autodocs"],
  args: {
    name: "",
    clubNumber: "",
    saving: false,
    message: null,
    onNameChange: fn(),
    onClubNumberChange: fn(),
    onSave: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ClubSettingsForm>;

/** First-time setup: both fields blank, no message. */
export const Empty: Story = {};

/** Editing an existing club record loaded from the server. */
export const Prefilled: Story = {
  args: {
    name: "Anytown Bridge Club",
    clubNumber: "12345",
  },
};

/** A save is in flight — the Save button is disabled and shows "Saving...". */
export const Saving: Story = {
  args: {
    name: "Anytown Bridge Club",
    clubNumber: "12345",
    saving: true,
  },
};

/** Successful save confirmation. */
export const Saved: Story = {
  args: {
    name: "Anytown Bridge Club",
    clubNumber: "12345",
    message: "✅ Club info saved",
  },
};

/** Client-side validation error (both fields are required). */
export const ValidationError: Story = {
  args: {
    message: "Both fields are required",
  },
};

/** The admin session expired (a 401 from the save) and must be re-entered. */
export const SessionExpired: Story = {
  args: {
    name: "Anytown Bridge Club",
    clubNumber: "12345",
    message: "Session expired. Please re-enter the admin key.",
  },
};
