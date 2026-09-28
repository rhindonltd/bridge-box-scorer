import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlayHeaderMenu } from "@/app/game/[gameId]/play/[initialSeat]/PlayHeaderMenu";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame } from "@/mocks/fixtures/game";

/** Seed (or clear) the director token this device holds for the game. */
function setDirector(isDirector: boolean) {
  if (isDirector) {
    localStorage.setItem(`director:${mockGame.gameId}`, "director-tok");
  } else {
    localStorage.removeItem(`director:${mockGame.gameId}`);
  }
}

const meta: Meta<typeof PlayHeaderMenu> = {
  title: "App/Play/Game/Assignment/PlayHeaderMenu",
  component: PlayHeaderMenu,
  parameters: {
    layout: "centered",
    nextjs: { appDirectory: true },
  },
  decorators: [
    withGame(mockGame),
    withAssignment({ type: "PAIR", id: "A1NS" }),
    // Render against the header's grey bar so the visible "Manage" button reads
    // correctly in context.
    (Story) => (
      <div className="bg-gray-200 p-2" style={{ minWidth: 360 }}>
        <div className="flex justify-end">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { gameId: mockGame.gameId, seat: "A1NS" },
};

export default meta;
type Story = StoryObj<typeof PlayHeaderMenu>;

/**
 * A player (non-director) device: just the hamburger with Change device / Pair
 * details. No Manage switch.
 */
export const Player: Story = {
  decorators: [
    (Story) => {
      setDirector(false);
      return <Story />;
    },
  ],
};

/**
 * A director device: the visible "Manage" button appears alongside the
 * hamburger (at `sm`+); below `sm` "Manage" folds into the hamburger instead.
 */
export const Director: Story = {
  decorators: [
    (Story) => {
      setDirector(true);
      return <Story />;
    },
  ],
};
