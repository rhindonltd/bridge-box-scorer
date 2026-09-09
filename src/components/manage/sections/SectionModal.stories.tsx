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

/** First add: name the existing section and the new one. */
export const FirstAdd: Story = {
  args: {
    existingSection: { letter: "A", label: "A" },
    newSectionLetter: "B",
  },
};

/** Subsequent add: name just the new section. */
export const AddAnother: Story = {
  args: {
    newSectionLetter: "C",
  },
};
