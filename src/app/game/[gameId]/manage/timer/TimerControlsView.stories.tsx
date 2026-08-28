import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TimerControlsView } from "@/app/game/[gameId]/manage/timer/TimerControlsView";
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

const meta: Meta<typeof TimerControlsView> = {
  title: "Pages/Timer/TimerControlsView",
  component: TimerControlsView,
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onConfigChange: fn(),
    onCreate: fn(),
    onApplyChanges: fn(),
    onStart: fn(),
    onPause: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TimerControlsView>;

export const NoSession: Story = {
  args: {
    hasSession: false,
    timer: null,
    config: {
      boardsPerRound: 3,
      totalRounds: 8,
      playMinutes: 2,
      playSeconds: 0,
      moveMinutes: 1,
      moveSeconds: 30,
      timingMode: "perRound",
    },
    sessionLength: "26m 30s",
    previewEnd: "20:26",
  },
};

export const ActiveSession: Story = {
  args: {
    hasSession: true,
    timer: {
      isRunning: true,
      phase: "play",
      remaining: 345,
      round: 3,
      projectedEndDate: new Date(Date.now() + 3600000),
    },
    config: {
      boardsPerRound: 3,
      totalRounds: 8,
      playMinutes: 7,
      playSeconds: 0,
      moveMinutes: 1,
      moveSeconds: 30,
      timingMode: "perRound",
    },
    sessionLength: "",
    previewEnd: "",
  },
};

export const Paused: Story = {
  args: {
    hasSession: true,
    timer: {
      isRunning: false,
      phase: "play",
      remaining: 180,
      round: 5,
      projectedEndDate: null,
    },
    config: {
      boardsPerRound: 3,
      totalRounds: 8,
      playMinutes: 7,
      playSeconds: 0,
      moveMinutes: 1,
      moveSeconds: 30,
      timingMode: "perRound",
    },
    sessionLength: "",
    previewEnd: "",
  },
};

export const Finished: Story = {
  args: {
    hasSession: true,
    timer: {
      isRunning: false,
      phase: "finished",
      remaining: 0,
      round: 8,
      projectedEndDate: null,
    },
    config: {
      boardsPerRound: 3,
      totalRounds: 8,
      playMinutes: 7,
      playSeconds: 0,
      moveMinutes: 1,
      moveSeconds: 30,
      timingMode: "perRound",
    },
    sessionLength: "",
    previewEnd: "",
  },
};
