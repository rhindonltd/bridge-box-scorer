import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MovementDetailView } from "./MovementDetailView";

const meta: Meta<typeof MovementDetailView> = {
  title: "Components/Movement/MovementDetailView",
  component: MovementDetailView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MovementDetailView>;

// 1. No progress data (setup view - no played column shown)
export const SetupView: Story = {
  args: {
    movementName: "Mitchell 4 Tables",
    movementType: "PAIRS",
    onSelect: fn(),
    tables: [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3 },
          { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6 },
          { roundNumber: 3, ns: "1", ew: "7", boardStart: 7, boardEnd: 9 },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6 },
          { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9 },
          { roundNumber: 3, ns: "2", ew: "8", boardStart: 10, boardEnd: 12 },
        ],
      },
      {
        tableNumber: 3,
        rounds: [
          { roundNumber: 1, ns: "3", ew: "7", boardStart: 7, boardEnd: 9 },
          { roundNumber: 2, ns: "3", ew: "8", boardStart: 10, boardEnd: 12 },
          { roundNumber: 3, ns: "3", ew: "5", boardStart: 1, boardEnd: 3 },
        ],
      },
      {
        tableNumber: 4,
        rounds: [
          { roundNumber: 1, ns: "4", ew: "8", boardStart: 10, boardEnd: 12 },
          { roundNumber: 2, ns: "4", ew: "5", boardStart: 1, boardEnd: 3 },
          { roundNumber: 3, ns: "4", ew: "6", boardStart: 4, boardEnd: 6 },
        ],
      },
    ],
  },
};

// 2. Brand new game - all 0/3, no colours
export const NewGame: Story = {
  args: {
    movementName: "Monday AM Pairs",
    movementType: "PAIRS",
    tables: [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3, played: 0, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6, played: 0, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "1", ew: "7", boardStart: 7, boardEnd: 9, played: 0, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6, played: 0, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9, played: 0, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "2", ew: "8", boardStart: 10, boardEnd: 12, played: 0, total: 3, hasPreviousGap: false },
        ],
      },
    ],
  },
};

// 3. Game in progress - mix of complete (green), in progress (yellow), and not started (no colour)
export const InProgress: Story = {
  args: {
    movementName: "Tuesday PM Pairs",
    movementType: "PAIRS",
    tables: [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6, played: 2, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "1", ew: "7", boardStart: 7, boardEnd: 9, played: 0, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "2", ew: "8", boardStart: 10, boardEnd: 12, played: 1, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 3,
        rounds: [
          { roundNumber: 1, ns: "3", ew: "7", boardStart: 7, boardEnd: 9, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "3", ew: "8", boardStart: 10, boardEnd: 12, played: 0, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "3", ew: "5", boardStart: 1, boardEnd: 3, played: 0, total: 3, hasPreviousGap: false },
        ],
      },
    ],
  },
};

// 4. Problem detected - table has results in round 2 but round 1 is incomplete (red)
export const WithGaps: Story = {
  args: {
    movementName: "Problem Game",
    movementType: "PAIRS",
    tables: [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "1", ew: "7", boardStart: 7, boardEnd: 9, played: 1, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6, played: 2, total: 3, hasPreviousGap: true },
          { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9, played: 1, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "2", ew: "8", boardStart: 10, boardEnd: 12, played: 0, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 3,
        rounds: [
          { roundNumber: 1, ns: "3", ew: "7", boardStart: 7, boardEnd: 9, played: 1, total: 3, hasPreviousGap: true },
          { roundNumber: 2, ns: "3", ew: "8", boardStart: 10, boardEnd: 12, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "3", ew: "5", boardStart: 1, boardEnd: 3, played: 2, total: 3, hasPreviousGap: false },
        ],
      },
    ],
  },
};

// 5. All complete - everything green
export const AllComplete: Story = {
  args: {
    movementName: "Finished Game",
    movementType: "PAIRS",
    tables: [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "1", ew: "7", boardStart: 7, boardEnd: 9, played: 3, total: 3, hasPreviousGap: false },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9, played: 3, total: 3, hasPreviousGap: false },
          { roundNumber: 3, ns: "2", ew: "8", boardStart: 10, boardEnd: 12, played: 3, total: 3, hasPreviousGap: false },
        ],
      },
    ],
  },
};


