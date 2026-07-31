import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RoundInfoPage } from "@/components/pages/play/RoundInfoPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof RoundInfoPage> = {
  title: "Pages/Play/RoundInfoPage",
  component: RoundInfoPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    round: 1,
    table: 5,
    boards: [1, 2, 3],
    players: {
      N: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: "477484" },
      S: { id: 2, firstName: "Bob", lastName: "Johnson", nationalId: null },
      E: {
        id: 3,
        firstName: "Carol",
        lastName: "Williams",
        nationalId: "123456",
      },
      W: { id: 4, firstName: "David", lastName: "Brown", nationalId: "654321" },
    },
    onEnterRound: () => alert("Enter Round clicked"),
  },
};

export default meta;

type Story = StoryObj<typeof RoundInfoPage>;

export const Default: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
};

export const LaterRound: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "1",
    }),
  ],
  args: {
    round: 4,
    table: 12,
    boards: [10, 11, 12],
  },
};

export const LongNames: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      id: "11EW",
    }),
  ],
  args: {
    players: {
      N: {
        id: 1,
        firstName: "Alexandria",
        lastName: "Montgomery-Wellington",
        nationalId: "123456",
      },
      S: {
        id: 2,
        firstName: "Christopher",
        lastName: "Van Der Berg",
        nationalId: null,
      },
      E: {
        id: 3,
        firstName: "Maximilian",
        lastName: "Fitzgerald-Smythe",
        nationalId: null,
      },
      W: {
        id: 4,
        firstName: "Elizabeth",
        lastName: "O’Connell-Rutherford",
        nationalId: null,
      },
    },
  },
};

