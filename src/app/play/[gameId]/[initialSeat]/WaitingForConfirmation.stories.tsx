import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WaitingForConfirmation } from "./WaitingForConfirmation";
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

const meta: Meta<typeof WaitingForConfirmation> = {
  title: "App/Play/Game/Assignment/WaitingForConfirmation",
  component: WaitingForConfirmation,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WaitingForConfirmation>;

export const Default: Story = {
  args: { boardNumber: 5 },
};
