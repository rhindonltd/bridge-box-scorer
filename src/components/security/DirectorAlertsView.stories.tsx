import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DirectorAlertsView } from "@/components/security/DirectorAlertsView";
import type { DirectorAlert } from "@/model/director-alert";

const seat = {
  eventName: "Monday Pairs",
  seatLabel: "Table 3 NS",
  players: "Mary Smith & John Jones",
};

const signedIn: DirectorAlert = {
  id: "a1",
  at: new Date().toISOString(),
  kind: "signedIn",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  method: "adminKey",
  seatedAs: [seat],
};

const failures: DirectorAlert = {
  id: "a2",
  at: new Date().toISOString(),
  kind: "repeatedFailures",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  failures: 3,
  blockedMinutes: 5,
  seatedAs: [seat],
};

const meta: Meta<typeof DirectorAlertsView> = {
  title: "Components/Security/DirectorAlertsView",
  component: DirectorAlertsView,
  parameters: { layout: "fullscreen" },
  args: { onDismiss: fn() },
};
export default meta;

type Story = StoryObj<typeof DirectorAlertsView>;

/** Someone seated at a table became a director using the admin key. */
export const SignedIn: Story = { args: { alerts: [signedIn] } };

/** A device tried three times in quick succession and is now blocked. */
export const RepeatedFailures: Story = { args: { alerts: [failures] } };

/** A device that isn't seated unlocked Settings. */
export const SettingsUnlockNotSeated: Story = {
  args: {
    alerts: [
      {
        ...signedIn,
        id: "a3",
        audience: { kind: "settings" },
        seatedAs: [],
      },
    ],
  },
};

const call: DirectorAlert = {
  id: "c1",
  at: new Date().toISOString(),
  kind: "callDirector",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  table: { section: null, tableNumber: 3, roundNumber: 2, side: "NS" },
  players: "Mary Smith & John Jones",
  calls: 1,
};

/** A pair at a table has called the director. */
export const CallDirector: Story = { args: { alerts: [call] } };

/** The pair called again before a director came. */
export const CalledAgain: Story = {
  args: { alerts: [{ ...call, calls: 3 }] },
};

/** Several alerts stack, each dismissed separately. */
export const Several: Story = { args: { alerts: [call, signedIn, failures] } };
