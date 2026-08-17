import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageMovementPage } from "./ManageMovementPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof ManageMovementPage> = {
  title: "App/Manage/Game/Movement/ManageMovementPage",
  component: ManageMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    backHref: "/games",
  },
};

export default meta;
type Story = StoryObj<typeof ManageMovementPage>;

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
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
};
