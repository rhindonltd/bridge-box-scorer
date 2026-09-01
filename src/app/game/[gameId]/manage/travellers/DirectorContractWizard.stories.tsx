import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { GameContext } from "@/context/GameContext";
import { AssignmentContext } from "@/context/AssignmentContext";
import { DirectorContractWizard } from "@/app/game/[gameId]/manage/travellers/DirectorContractWizard";
import { KeyedMutator } from "swr";
import { BridgeGame } from "@/db/game-index/schema";
import { mockGame } from "@/mocks/fixtures/game";

const mockAssignment = {
  type: "PAIR" as const,
  id: "3",
};

const mockMutateGame: KeyedMutator<BridgeGame> = async () => {
  return undefined;
};

const meta: Meta<typeof DirectorContractWizard> = {
  title: "App/Manage/Game/CorrectResult/DirectorContractWizard",
  component: DirectorContractWizard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    round: 2,
    table: 3,
    leadCardRequired: false,
    onComplete: fn(),
  },
  decorators: [
    (Story) => (
      <GameContext.Provider
        value={{
          game: mockGame as any,
          isLoading: false,
          mutateGame: mockMutateGame,
        }}
      >
        <AssignmentContext.Provider
          value={{ assignment: mockAssignment, isLoading: false }}
        >
          <div style={{ height: "100dvh" }} className="flex flex-col">
            <Story />
          </div>
        </AssignmentContext.Provider>
      </GameContext.Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof DirectorContractWizard>;

export const Default: Story = {};

export const WithLeadRequired: Story = {
  args: {
    leadCardRequired: true,
  },
};
