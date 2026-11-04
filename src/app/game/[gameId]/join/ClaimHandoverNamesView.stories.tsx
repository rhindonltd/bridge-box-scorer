import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ClaimHandoverNamesView } from "@/app/game/[gameId]/join/ClaimHandoverNamesView";

const meta: Meta<typeof ClaimHandoverNamesView> = {
  title: "App/Join/ClaimHandoverNamesView",
  component: ClaimHandoverNamesView,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    player1: null,
    player2: null,
    error: null,
    loading: false,
    onPlayer1Change: fn(),
    onPlayer2Change: fn(),
    onSubmit: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ClaimHandoverNamesView>;

/** Empty — submit disabled until both arriving players are chosen. */
export const Empty: Story = {};

/** Both players chosen — submit enabled. */
export const BothChosen: Story = {
  args: {
    player1: { firstName: "Alice", lastName: "Smith", nationalId: null },
    player2: { firstName: "Bob", lastName: "Jones", nationalId: null },
  },
};

/** A server error (e.g. a third pair on a seat that already has a substitute). */
export const WithError: Story = {
  args: {
    player1: { firstName: "Alice", lastName: "Smith", nationalId: null },
    player2: { firstName: "Bob", lastName: "Jones", nationalId: null },
    error:
      "This seat already has a substitute. Only the pair who played it earlier (Carol May & Dan Fox) can take it back.",
  },
};
