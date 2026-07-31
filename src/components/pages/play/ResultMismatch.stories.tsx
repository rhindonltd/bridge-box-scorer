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

export const SameBoardDifferentResult: Story = {
  args: {
    nsBoardNumber: 7,
    nsResult: "3NTN=",
    ewBoardNumber: 7,
    ewResult: "3NTN+1",
  },
};

export const DifferentBoards: Story = {
  args: {
    nsBoardNumber: 7,
    nsResult: "3NTN=",
    ewBoardNumber: 8,
    ewResult: "4HE+1",
  },
};

export const SpecialOutcomes: Story = {
  args: {
    nsBoardNumber: 12,
    nsResult: "PO",
    ewBoardNumber: 12,
    ewResult: "2CN=",
  },
};
