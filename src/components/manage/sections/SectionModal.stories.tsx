import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SectionModal } from "./SectionModal";

const meta: Meta<typeof SectionModal> = {
  title: "Manage/Sections/SectionModal",
  component: SectionModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    open: true,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SectionModal>;

/** Single-section game: defaults to Split, naming both resulting sections. */
export const FirstSplit: Story = {
  args: {
    sections: [{ letter: "A", label: "A", tables: 4 }],
    newSectionLetter: "B",
  },
};

/** Multi-section game: defaults to Add; the toggle also offers Split. */
export const AddOrSplit: Story = {
  args: {
    sections: [
      { letter: "A", label: "A", tables: 6 },
      { letter: "B", label: "B", tables: 4 },
    ],
    newSectionLetter: "C",
  },
};

/** No section is big enough to split: Add only, no mode toggle. */
export const AddOnly: Story = {
  args: {
    sections: [{ letter: "A", label: "A", tables: 1 }],
    newSectionLetter: "B",
  },
};
