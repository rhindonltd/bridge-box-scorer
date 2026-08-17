import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CorrectResultPage } from "./CorrectResultPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof CorrectResultPage> = {
  title: "App/Manage/Game/CorrectResult/CorrectResultPage",
  component: CorrectResultPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onResultCorrected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CorrectResultPage>;

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
