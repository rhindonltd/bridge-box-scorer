import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameComplete } from "./GameComplete";
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

const meta: Meta<typeof GameComplete> = {
  title: "App/Play/Game/Assignment/GameComplete",
  component: GameComplete,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/play/abc123/1NS",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GameComplete>;

export const Default: Story = {
  args: {
    loading: false,
  },
};
