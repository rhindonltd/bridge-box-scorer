import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MoveInfoPage } from "./MoveInfoPage";
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

const meta: Meta<typeof MoveInfoPage> = {
  title: "Pages/Play/MoveInfoPage",
  component: MoveInfoPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { onMoveInfoContinue: fn() },
};

export default meta;
type Story = StoryObj<typeof MoveInfoPage>;

export const Default: Story = {
  args: {
    roundNumber: 2,
    tableNumber: 3,
    sitOut: false,
  },
};

export const SitOut: Story = {
  args: {
    roundNumber: 2,
    tableNumber: 3,
    sitOut: true,
  },
};
