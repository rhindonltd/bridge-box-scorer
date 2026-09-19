import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { DirectorTableModal } from "./DirectorTableModal";
import type { DirectorTable } from "./DirectorTableControls";
import type { Seat } from "@/model/participants";

const fullTable: DirectorTable = {
  tableNumber: 3,
  players: {
    N: { id: 1, firstName: "Ada", lastName: "Lovelace", nationalId: null },
    S: { id: 2, firstName: "Alan", lastName: "Turing", nationalId: null },
    E: { id: 3, firstName: "Grace", lastName: "Hopper", nationalId: null },
    W: { id: 4, firstName: "Edsger", lastName: "Dijkstra", nationalId: null },
  },
  seats: {
    N: "A3NS" as Seat,
    S: "A3NS" as Seat,
    E: "A3EW" as Seat,
    W: "A3EW" as Seat,
  },
  stationary: { N: true, S: true, E: false, W: false },
};

const partialTable: DirectorTable = {
  tableNumber: 5,
  players: {
    N: { id: 1, firstName: "Ada", lastName: "Lovelace", nationalId: null },
    S: { id: 2, firstName: "Alan", lastName: "Turing", nationalId: null },
    E: null,
    W: null,
  },
  seats: {
    N: "A5NS" as Seat,
    S: "A5NS" as Seat,
    E: null,
    W: null,
  },
};

const meta: Meta<typeof DirectorTableModal> = {
  title: "Components/Tables/DirectorTableModal",
  component: DirectorTableModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onEvict: fn(),
    onToggleStationary: fn(),
    onClose: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof DirectorTableModal>;

/** Non-Swiss movement: both pairs seated, evict only (no stationary control). */
export const Pairs: Story = {
  args: {
    table: fullTable,
    isSwiss: false,
  },
};

/** Swiss movement: each seated pair also has a Stationary toggle. */
export const Swiss: Story = {
  args: {
    table: fullTable,
    isSwiss: true,
  },
};

/** Only the North/South pair is seated; the East/West row shows as empty. */
export const PartiallyFilled: Story = {
  args: {
    table: partialTable,
    isSwiss: true,
  },
};
