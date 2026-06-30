import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameInfo } from "@/components/common/GameInfo";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof GameInfo> = {
  title: "Components/Common/Participant",
  component: GameInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof GameInfo>;

export const Individual: Story = {
  decorators: [
    withAssignment({
      type: "INDIVIDUAL",
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
