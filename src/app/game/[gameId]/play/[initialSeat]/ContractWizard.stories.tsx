import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ContractWizard } from "@/app/game/[gameId]/play/[initialSeat]/ContractWizard";
import { GameContext } from "@/context/GameContext";
import { AssignmentContext } from "@/context/AssignmentContext";

const mockGame = {
  gameId: "test-game-1",
  eventName: "Monday AM Pairs",
  sessionName: "Afternoon",
  sectionName: "Section A",
  gameType: "PAIRS" as const,
  director: "John Smith",
  eventDate: "2024-01-15",
  status: "JOINABLE" as const,
  tables: 4,
  scoringType: "MP",
};

const mockAssignment = {
  type: "PAIR" as const,
  id: "3",
};

const meta: Meta<typeof ContractWizard> = {
  title: "App/Play/Game/Assignment/ContractWizard",
  component: ContractWizard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    round: 2,
    table: 3,
    roundBoards: [7, 8, 9],
    playedBoards: [],
    leadCardRequired: false,
    onComplete: fn(),
  },
  decorators: [
    (Story) => (
      <GameContext.Provider
        value={{
          game: mockGame as any,
          isLoading: false,
          mutateGame: () => {},
        }}
      >
        <AssignmentContext.Provider value={{ assignment: mockAssignment }}>
          <div style={{ height: "100dvh" }} className="flex flex-col">
            <Story />
          </div>
        </AssignmentContext.Provider>
      </GameContext.Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ContractWizard>;

export const Default: Story = {};

export const WithLeadRequired: Story = {
  args: {
    leadCardRequired: true,
  },
};

export const SingleBoard: Story = {
  args: {
    roundBoards: [1],
  },
};

export const WithPlayedBoards: Story = {
  args: {
    playedBoards: [7],
  },
};
