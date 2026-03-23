import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import MovementOptionsPage from "@/components/pages/movement/MovementOptionsPage";

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
  args: {
    eventName: 'Monday PM Pairs',
    tables: 5,
  },
};

export const EventWithSessionAndSection: Story = {
    args: {
        eventName: 'Monday PM Pairs',
        sessionName: 'Session 1',
        sectionName: 'Section A',
        tables: 5,
    },
};
