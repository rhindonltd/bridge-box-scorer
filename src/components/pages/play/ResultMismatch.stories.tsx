import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ResultMismatch } from "./ResultMismatch";
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
  status: "JOINABLE" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof ResultMismatch> = {
  title: "Pages/Play/ResultMismatch",
  component: ResultMismatch,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { onReenter: fn() },
};

export default meta;
type Story = StoryObj<typeof ResultMismatch>;

export const Default: Story = {
  args: {
    boardNumber: 7,
    nsResult: "3NTN=",
    ewResult: "3NTN+1",
  },
};

export const DifferentContracts: Story = {
  args: {
    boardNumber: 3,
    nsResult: "4HE=",
    ewResult: "3NTE+1",
  },
};

export const SpecialOutcomes: Story = {
  args: {
    boardNumber: 12,
    nsResult: "PO",
    ewResult: "2CN=",
  },
};
