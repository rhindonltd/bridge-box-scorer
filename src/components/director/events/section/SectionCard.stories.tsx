import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SectionCard from "./SectionCard";
import { fn } from "storybook/test";

const meta: Meta<typeof SectionCard> = {
  title: "Director/Events/Section/SectionCard",
  component: SectionCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {
  args: {
    section: {
      id: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      sectionName: "Section A",
      started: false,
      finished: false,
    },
  },
};
