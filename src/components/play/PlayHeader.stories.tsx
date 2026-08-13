import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlayHeader } from "./PlayHeader";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const mockGame = {
  id: 1,
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  gameId: "abc123",
  sessionName: "Session 1",
  sectionName: "Section A",
  eventDate: new Date().toISOString(),
  tables: 8,
  leadCardRequired: true,
  status: "JOINABLE" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof PlayHeader> = {
  title: "Components/Play/PlayHeader",
  component: PlayHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
};

export default meta;

type Story = StoryObj<typeof PlayHeader>;

export const WithDetail: Story = {
  args: {
    detail: "Board 5",
  },
};

export const NoDetail: Story = {
  args: {},
};
