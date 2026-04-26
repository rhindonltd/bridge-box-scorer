import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SectionCard from "./SectionCard";
import { fn } from "storybook/test";

const meta: Meta<typeof SectionCard> = {
  title: "Components/Director/Sections/SectionCard",
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
      sessionId: 1,
      sectionName: "Section A",
      gameDb: crypto.randomUUID(),
      status: 'CREATED'
    },
  },
};
