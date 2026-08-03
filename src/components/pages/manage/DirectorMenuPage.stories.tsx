import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DirectorMenuPage } from "./DirectorMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";

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

const meta: Meta<typeof DirectorMenuPage> = {
  title: "Pages/Manage/DirectorMenuPage",
  component: DirectorMenuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onTimerClick: fn(),
    onTravellersClick: fn(),
    onChangeStatusClick: fn(),
    onMovementClick: fn(),
    onDownloadUsebioClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DirectorMenuPage>;

export const Default: Story = {};
