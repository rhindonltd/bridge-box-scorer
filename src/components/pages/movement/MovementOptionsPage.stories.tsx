import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import MovementOptionsPage from "@/components/pages/movement/MovementOptionsPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof MovementOptionsPage> = {
  title: "Pages/Movement/MovementOptionsPage",
  component: MovementOptionsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmit: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof MovementOptionsPage>;

export const Default: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs" })],
  args: {
    tables: 5,
  },
};

export const EventWithSessionAndSection: Story = {
  decorators: [withGame({ eventName: "Monday PM Pairs", sessionName: 'Session 1', sectionName: 'Section A' })],
  args: {
    tables: 5,
  },
};
