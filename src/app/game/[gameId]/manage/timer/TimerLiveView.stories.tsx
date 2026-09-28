import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TimerLiveView } from "@/app/game/[gameId]/manage/timer/TimerLiveView";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof TimerLiveView> = {
  title: "App/Manage/Game/Timer/TimerLiveView",
  component: TimerLiveView,
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    adjustApplyToFuture: false,
    onStart: fn(),
    onPause: fn(),
    onNext: fn(),
    onPrevious: fn(),
    onAdjustTime: fn(),
    onAdjustApplyToFutureChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TimerLiveView>;

export const Running: Story = {
  args: {
    timer: {
      isRunning: true,
      phase: "play",
      remaining: 345,
      round: 3,
      projectedEndDate: new Date(Date.now() + 3600000),
    },
  },
};

export const Paused: Story = {
  args: {
    timer: {
      isRunning: false,
      phase: "play",
      remaining: 180,
      round: 5,
      // A paused (but not finished) timer still has a projected finish time,
      // computed from the remaining session, so "Live End" is shown.
      projectedEndDate: new Date(Date.now() + 2400000),
    },
  },
};

export const Finished: Story = {
  args: {
    timer: {
      isRunning: false,
      phase: "finished",
      remaining: 0,
      round: 8,
      projectedEndDate: null,
    },
  },
};
