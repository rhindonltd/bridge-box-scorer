import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { TimerConfigView } from "@/app/game/[gameId]/manage/timer/TimerConfigView";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof TimerConfigView> = {
  title: "App/Manage/Game/Timer/TimerConfigView",
  component: TimerConfigView,
  decorators: [withGame(mockGame)],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    breakProblems: [],
    onConfigChange: fn(),
    onAddBreak: fn(),
    onRemoveBreak: fn(),
    onBreakChange: fn(),
    onSave: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TimerConfigView>;

const config = {
  boardsPerRound: 3,
  totalRounds: 8,
  playMinutes: 2,
  playSeconds: 0,
  moveMinutes: 1,
  moveSeconds: 30,
  timingMode: "perRound" as const,
  warningSeconds: 60,
  breaks: [],
};

export const Default: Story = {
  args: {
    config,
    sessionLength: "26m 30s",
    previewEnd: "20:26",
  },
};

export const WithBreak: Story = {
  args: {
    config: {
      ...config,
      breaks: [
        {
          afterRound: 4,
          mode: "duration",
          durationMinutes: 10,
          resumeAt: "",
        },
      ],
    },
    sessionLength: "36m 30s",
    previewEnd: "20:36",
  },
};

export const Embedded: Story = {
  args: {
    config,
    sessionLength: "26m 30s",
    previewEnd: "20:26",
    embedded: true,
  },
};
