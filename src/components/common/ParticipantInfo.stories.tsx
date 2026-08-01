import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { ParticipantInfo } from "./ParticipantInfo";

const meta: Meta<typeof ParticipantInfo> = {
  title: "Components/Common/ParticipantInfo",
  component: ParticipantInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ParticipantInfo>;

export const Individual: Story = {
  decorators: [
    withAssignment({
      type: "PAIR",
      id: "12E",
    }),
  ],
};

export const Pair: Story = {
  decorators: [
    withAssignment({
      type: "PAIR",
      id: "3EW",
    }),
  ],
};

export const Team: Story = {
  decorators: [
    withAssignment({
      type: "TEAM",
      id: "1",
    }),
  ],
};
