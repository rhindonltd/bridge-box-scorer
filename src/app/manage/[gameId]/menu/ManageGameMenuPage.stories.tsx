import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageGameMenuPage } from "./ManageGameMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const mockGame = {
  id: 1,
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  gameId: "abc123",
  sessionName: "1",
  sectionName: "A",
  eventDate: new Date().toISOString(),
  tables: 8,
  leadCardRequired: true,
  status: "JOINABLE" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof ManageGameMenuPage> = {
  title: "Pages/Manage/DirectorMenuPage",
  component: ManageGameMenuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onTimerClick: fn(),
    onTravellersClick: fn(),
    onMovementClick: fn(),
    onDownloadUsebioClick: fn(),
    onDeleteGameClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ManageGameMenuPage>;

export const Default: Story = {};
