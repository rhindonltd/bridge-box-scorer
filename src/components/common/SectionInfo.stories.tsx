import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionInfo } from "@/components/common/SectionInfo";

const meta: Meta<typeof SectionInfo> = {
  title: "Components/Common/SectionInfo",
  component: SectionInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SectionInfo>;

export const EventOnly: Story = {
  args: {
    eventName: "Monday PM Pairs",
  },
};

export const EventAndSection: Story = {
  args: {
    eventName: "Monday PM Pairs",
    sectionName: "Section A",
  },
};

export const EventSessionAndSection: Story = {
  args: {
    eventName: "Monday PM Pairs",
    sessionName: "Session 1",
    sectionName: "Section A",
  },
};
