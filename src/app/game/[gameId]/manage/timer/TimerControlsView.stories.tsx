import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TimerControlsView } from "@/app/game/[gameId]/manage/timer/TimerControlsView";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof TimerControlsView> = {
  title: "App/Manage/Game/Timer/TimerControlsView",
  component: TimerControlsView,
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    breakProblems: [],
    adjustApplyToFuture: false,
    onConfigChange: fn(),
    onAddBreak: fn(),
    onRemoveBreak: fn(),
    onBreakChange: fn(),
    onCreate: fn(),
    onApplyChanges: fn(),
    onStart: fn(),
    onPause: fn(),
    onNext: fn(),
    onPrevious: fn(),
    onAdjustTime: fn(),
    onAdjustApplyToFutureChange: fn(),
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
      warningSeconds: 60,
      breaks: [],
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
      warningSeconds: 60,
      breaks: [],
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
      warningSeconds: 60,
      breaks: [],
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
      warningSeconds: 60,
      breaks: [],
    },
    sessionLength: "",
    previewEnd: "",
  },
};
