import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SitOutPage } from "./SitOutPage";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { fn } from "storybook/test";
import { withGame } from "../../../../.storybook/decorators/GameDecorator";

const meta: Meta<typeof SitOutPage> = {
  title: "Pages/Play/SitOutPage",
  component: SitOutPage,
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
    withAssignment({ type: "PAIR", id: "1NS" }),
  ],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onHandleSitOutContinue: () => fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SitOutPage>;

export const Default: Story = {
  args: { round: 5 },
};
