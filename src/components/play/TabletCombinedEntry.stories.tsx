import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TabletCombinedEntry } from "./TabletCombinedEntry";
import { GameContext } from "@/context/GameContext";
import { AssignmentContext } from "@/context/AssignmentContext";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Assignment } from "@/model/participants";

const mockGame: BridgeGame = {
  id: 1,
  eventName: "Monday Pairs",
  director: "Director",
  gameType: "PAIRS",
  scoringType: "MP",
  gameId: "abc123",
  sessionName: "Evening",
  sectionName: "A",
  eventDate: "2024-06-01",
  tables: 6,
  status: "JOINABLE",
  createdAt: "2024-06-01T18:00:00Z",
  updatedAt: "2024-06-01T18:00:00Z",
};

const mockAssignment: Assignment = {
  type: "PAIR",
  id: "3",
};

const meta: Meta<typeof TabletCombinedEntry> = {
  title: "Play/TabletCombinedEntry",
  component: TabletCombinedEntry,
  parameters: { layout: "fullscreen" },
  args: {
    round: 1,
    table: 3,
    roundBoards: [1, 2, 3],
    leadCardRequired: true,
    onComplete: fn(),
  },
  decorators: [
    (Story) => (
      <GameContext.Provider
        value={{ game: mockGame, isLoading: false, mutateGame: fn() }}
      >
        <AssignmentContext.Provider value={{ assignment: mockAssignment }}>
          <div className="h-dvh flex flex-col">
            <Story />
          </div>
        </AssignmentContext.Provider>
      </GameContext.Provider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TabletCombinedEntry>;

export const Empty: Story = {};
export const WithLeadCard: Story = { args: { leadCardRequired: true } };
export const WithoutLeadCard: Story = { args: { leadCardRequired: false } };
export const PassOutSelected: Story = {};
