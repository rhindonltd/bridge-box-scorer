import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { CallDirectorDialog } from "./CallDirectorDialog";

const table = {
  section: null,
  tableNumber: 3,
  roundNumber: 2,
  side: "NS" as const,
};

const meta: Meta<typeof CallDirectorDialog> = {
  title: "App/Play/Game/CallDirectorDialog",
  component: CallDirectorDialog,
  parameters: { layout: "fullscreen" },
  args: { onConfirm: fn(), onClose: fn() },
};

export default meta;
type Story = StoryObj<typeof CallDirectorDialog>;

export const Confirm: Story = { args: { state: { step: "confirm" } } };

export const Sending: Story = { args: { state: { step: "sending" } } };

export const Called: Story = {
  args: { state: { step: "called", table, calls: 1 } },
};

export const CalledAgain: Story = {
  args: { state: { step: "called", table, calls: 3 } },
};

export const OnTheWay: Story = { args: { state: { step: "answered" } } };

export const Failed: Story = {
  args: { state: { step: "error", message: "This game has been finalised." } },
};
