import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ShowMovementsPage } from "./ShowMovementsPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const pairsGame4Tables = {
  id: 1,
  eventName: "Monday AM Pairs",
  director: "Jacqui Collier",
  gameType: "PAIRS" as const,
  scoringType: "MP" as const,
  gameId: "abc123",
  sessionName: "1",
  sectionName: "A",
  eventDate: new Date().toISOString(),
  tables: 4,
  leadCardRequired: true,
  status: "CREATED" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const teamsGame4Tables = {
  id: 1,
  eventName: "Monday AM Teams",
  director: "Jacqui Collier",
  gameType: "TEAMS" as const,
  scoringType: "IMP" as const,
  gameId: "abc123",
  sessionName: "1",
  sectionName: "A",
  eventDate: new Date().toISOString(),
  tables: 4,
  leadCardRequired: true,
  status: "CREATED" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const pairsGame5Tables = {
  ...pairsGame4Tables,
  id: 2,
  eventName: "Tuesday PM Pairs",
  tables: 5,
  leadCardRequired: true,
};

const meta: Meta<typeof ShowMovementsPage> = {
  title: "App/Create/Game/ShowMovementsPage",
  component: ShowMovementsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onShowTablesPage: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ShowMovementsPage>;

export const Teams: Story = {
  decorators: [withGame(teamsGame4Tables)],
};

export const Pairs2Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 2,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs3Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 3,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs4Tables: Story = {
  decorators: [withGame(pairsGame4Tables)],
};

export const Pairs5Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 5,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs6Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 6,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs7Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 7,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs8Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 8,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs9Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 9,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs10Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 10,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs11Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 11,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs12Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 12,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs13Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 13,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs14Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 14,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs15Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 15,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs16Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 16,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs17Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 17,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs18Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 18,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs19Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 19,
      leadCardRequired: true,
    }),
  ],
};

export const Pairs20Tables: Story = {
  decorators: [
    withGame({
      ...pairsGame4Tables,
      id: 3,
      eventName: "Wednesday Pairs",
      tables: 20,
      leadCardRequired: true,
    }),
  ],
};
