import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DisplayTimerPage } from "@/app/game/[gameId]/display/timer/DisplayTimerPage";

const meta: Meta<typeof DisplayTimerPage> = {
  title: "App/Display/Game/Timer/DisplayTimerPage",
  component: DisplayTimerPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayTimerPage>;

const projectedEnd = new Date();
projectedEnd.setMinutes(projectedEnd.getMinutes() + 2);

const getProjectedEnd = (seconds: number) =>
  new Date(Date.now() + seconds * 1000);

export const Running: Story = {
  args: {
    title: "Round 3",
    boardLabel: "Boards 13–16",
    remaining: 125,
    phase: "play",
    isRunning: true,
    projectedEndDate: projectedEnd,
  },
};

export const Paused: Story = {
  args: {
    title: "Round 3",
    boardLabel: "Boards 13–16",
    remaining: 125,
    phase: "play",
    isRunning: false,
    projectedEndDate: projectedEnd,
  },
};

export const LastMinute: Story = {
  args: {
    title: "Round 3 of 6",
    boardLabel: "Board 16 of 16",
    remaining: 45,
    phase: "play",
    isRunning: true,
    projectedEndDate: getProjectedEnd(45),
  },
};

export const LastMinutePaused: Story = {
  args: {
    title: "Round 3 of 6",
    boardLabel: "Board 16 of 16",
    remaining: 45,
    phase: "play",
    isRunning: false,
    projectedEndDate: getProjectedEnd(45),
  },
};

export const Finished: Story = {
  args: {
    title: "Session Complete",
    remaining: 0,
    phase: "finished",
    isRunning: false,
    projectedEndDate: new Date(),
  },
};

export const WithoutBoardLabel: Story = {
  args: {
    title: "Break",
    remaining: 300,
    phase: "play",
    isRunning: true,
    projectedEndDate: getProjectedEnd(300),
  },
};

export const Move: Story = {
  args: {
    title: "Move for Round 3",
    remaining: 75,
    phase: "move",
    isRunning: true,
    projectedEndDate: getProjectedEnd(75),
  },
};

export const MoveAlmostComplete: Story = {
  args: {
    title: "Move for Round 3",
    remaining: 10,
    phase: "move",
    isRunning: true,
    projectedEndDate: getProjectedEnd(10),
  },
};

export const MovePaused: Story = {
  args: {
    title: "Move for Round 3",
    remaining: 42,
    phase: "move",
    isRunning: false,
    projectedEndDate: getProjectedEnd(42),
  },
};

export const Break: Story = {
  args: {
    title: "Break",
    remaining: 600,
    phase: "break",
    isRunning: true,
    projectedEndDate: getProjectedEnd(600),
  },
};

export const BreakPaused: Story = {
  args: {
    title: "Break",
    remaining: 420,
    phase: "break",
    isRunning: false,
    projectedEndDate: getProjectedEnd(420),
  },
};
