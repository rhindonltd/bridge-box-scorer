import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { BoardFlow } from "./BoardFlow";
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

const meta: Meta<typeof BoardFlow> = {
  title: "Components/Play/BoardFlow",
  component: BoardFlow,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    board: 1,
    contract: "4H",
    declarer: "N",
    openingLead: true,
    round: 1,
    table: 1,
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
          <Story />
        </AssignmentContext.Provider>
      </GameContext.Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BoardFlow>;

export const WithoutLead: Story = {
  args: {
    board: 5,
    contract: "4H",
    declarer: "N",
    openingLead: false,
  },
};

export const WithLead: Story = {
  args: {
    board: 12,
    contract: "3NT",
    declarer: "S",
    openingLead: true,
  },
};

export const MobileResult: Story = {
  args: {
    board: 1,
    contract: "4H",
    declarer: "N",
    openingLead: true,
    round: 1,
    table: 1,
    roundBoards: [1, 2, 3],
    leadCardRequired: true,
  },
  parameters: { viewport: { defaultViewport: "iphone12" } },
};

export const TabletCombined: Story = {
  args: {
    board: 1,
    contract: "4H",
    declarer: "N",
    openingLead: true,
    round: 1,
    table: 1,
    roundBoards: [1, 2, 3],
    leadCardRequired: true,
  },
  parameters: { viewport: { defaultViewport: "tablet" } },
};
