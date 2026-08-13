import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ChangeStatusPage } from "./ChangeStatusPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof ChangeStatusPage> = {
  title: "Pages/Manage/ChangeStatusPage",
  component: ChangeStatusPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onStatusChanged: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChangeStatusPage>;

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
