import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SectionManager } from "./SectionManager";
import { ClientSection } from "@/hooks/sections";

const meta: Meta<typeof SectionManager> = {
  title: "App/Manage/Game/Sections/SectionManager",
  component: SectionManager,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onAddSection: fn(),
    onRenameSection: fn(),
    onDeleteSection: fn(),
    onSelectMovement: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SectionManager>;

const single: ClientSection[] = [
  { section: "A", label: "A", tables: 8, ordinal: 0, selectedMovement: null },
];

const multi: ClientSection[] = [
  {
    section: "A",
    label: "Red Room",
    tables: 8,
    ordinal: 0,
    selectedMovement: {
      source: "MITCHELL",
      mitchell: { tables: 8, rounds: 8, boardsPerRound: 3 },
    },
  },
  {
    section: "B",
    label: "B",
    tables: 6,
    ordinal: 1,
    selectedMovement: null,
  },
];

export const SingleSection: Story = { args: { sections: single } };

export const MultipleSections: Story = { args: { sections: multi } };

export const ReadOnly: Story = { args: { sections: multi, readOnly: true } };
