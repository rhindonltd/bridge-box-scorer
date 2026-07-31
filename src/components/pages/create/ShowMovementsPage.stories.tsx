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
  sessionName: "Session 1",
  sectionName: "Section A",
  eventDate: new Date().toISOString(),
  tables: 4,
  status: "CREATED" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const pairsGame5Tables = {
  ...pairsGame4Tables,
  id: 2,
  eventName: "Tuesday PM Pairs",
  tables: 5,
};

const pairsGame8Tables = {
  ...pairsGame4Tables,
  id: 3,
  eventName: "Wednesday Pairs",
  tables: 8,
};

const individualGame = {
  ...pairsGame4Tables,
  id: 4,
  eventName: "Thursday Individual",
  gameType: "INDIVIDUAL" as const,
  tables: 5,
};

const meta: Meta<typeof ShowMovementsPage> = {
  title: "Pages/Create/ShowMovementsPage",
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

export const PairsEvenTables: Story = {
  decorators: [withGame(pairsGame4Tables)],
};

export const PairsOddTables: Story = {
  decorators: [withGame(pairsGame5Tables)],
};

export const PairsEightTables: Story = {
  decorators: [withGame(pairsGame8Tables)],
};

export const Individual: Story = {
  decorators: [withGame(individualGame)],
};
