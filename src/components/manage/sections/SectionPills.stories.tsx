import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SectionPills } from "./SectionPills";

const meta: Meta<typeof SectionPills> = {
  title: "Manage/Sections/SectionPills",
  component: SectionPills,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
    onAddSection: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SectionPills>;

export const SingleSection: Story = {
  args: {
    sections: [{ section: "A", label: "A" }],
    selected: "A",
  },
};

export const MultiSection: Story = {
  args: {
    sections: [
      { section: "A", label: "A" },
      { section: "B", label: "Blue" },
      { section: "C", label: "C" },
    ],
    selected: "B",
  },
};

/** Without the add pill (e.g. a game already in progress). */
export const NoAdd: Story = {
  args: {
    sections: [
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ],
    selected: "A",
    onAddSection: undefined,
  },
};
