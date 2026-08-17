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

const pairsGame5Tables = {
  ...pairsGame4Tables,
  id: 2,
  eventName: "Tuesday PM Pairs",
  tables: 5,
  leadCardRequired: true,
};

const pairsGame8Tables = {
  ...pairsGame4Tables,
  id: 3,
  eventName: "Wednesday Pairs",
  tables: 8,
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

export const PairsEvenTables: Story = {
  decorators: [withGame(pairsGame4Tables)],
};

export const PairsOddTables: Story = {
  decorators: [withGame(pairsGame5Tables)],
};

export const PairsEightTables: Story = {
  decorators: [withGame(pairsGame8Tables)],
};
