import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlayManageSwitch } from "@/components/game/PlayManageSwitch";

const GAME_ID = "game-1";

/** Seed (or clear) the seat token this device holds for the game. */
function setSeat(seat: string | null) {
  if (seat) {
    localStorage.setItem(
      `player:${GAME_ID}`,
      JSON.stringify({ startingPosition: seat, token: "seat-tok" }),
    );
  } else {
    localStorage.removeItem(`player:${GAME_ID}`);
  }
}

const meta: Meta<typeof PlayManageSwitch> = {
  title: "Components/Game/PlayManageSwitch",
  component: PlayManageSwitch,
  parameters: {
    // The switch navigates via the app router; give it one.
    nextjs: { appDirectory: true },
  },
  args: { gameId: GAME_ID },
  // The visible button is `hidden sm:inline-flex`; force a wide viewport so it
  // shows in the story canvas (below `sm` it folds into a menu instead).
  decorators: [
    (Story) => (
      <div className="p-4" style={{ minWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PlayManageSwitch>;

/** On a play screen: the button reads "Manage" and goes to the manage menu. */
export const ToManage: Story = {
  args: { direction: "toManage" },
};

/**
 * On a manage screen, when this device holds a seat: the button reads "Play"
 * and returns to that seat.
 */
export const ToPlaySeated: Story = {
  args: { direction: "toPlay" },
  decorators: [
    (Story) => {
      setSeat("A1NS");
      return <Story />;
    },
  ],
};

/**
 * On a manage screen, when this device is NOT seated: the button reads "Join"
 * and goes to the seat-selection flow.
 */
export const ToPlayUnseated: Story = {
  args: { direction: "toPlay" },
  decorators: [
    (Story) => {
      setSeat(null);
      return <Story />;
    },
  ],
};
