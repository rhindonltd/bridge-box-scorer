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

/**
 * Embedded with the section pills as a pinned sub-header. The pills bar stays
 * fixed at the top while the config body scrolls beneath it. Rendered in a
 * short, bounded box so the scroll/pin behaviour is visible.
 */
export const EmbeddedWithPinnedPills: Story = {
  args: {
    config,
    sessionLength: "26m 30s",
    previewEnd: "20:26",
    embedded: true,
    lockedStructure: true,
    headerSlot: (
      <div className="flex gap-2">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white">
          Section A
        </span>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">
          Split into sections
        </span>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="h-[420px] overflow-hidden border border-gray-300">
        <Story />
      </div>
    ),
  ],
};

/** Rounds and boards/round are derived from the movement, shown read-only. */
export const LockedStructure: Story = {
  args: {
    config,
    sessionLength: "26m 30s",
    previewEnd: "20:26",
    lockedStructure: true,
  },
};

/** No movement selected for the section: config disabled with a prompt. */
export const NoMovement: Story = {
  args: {
    config,
    sessionLength: "26m 30s",
    previewEnd: "20:26",
    noMovement: true,
  },
};
