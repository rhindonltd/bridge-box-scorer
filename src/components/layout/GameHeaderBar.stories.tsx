import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameHeaderBar } from "@/components/layout/GameHeaderBar";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof GameHeaderBar> = {
  title: "Components/Layout/GameHeaderBar",
  component: GameHeaderBar,
  parameters: {
    layout: "fullscreen",
    // GameHeaderBar reads the pathname (to auto-inject the manage switch) and,
    // on a manage route, the switch navigates via the router.
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    headerTitle: "Some Title",
  },
};

export default meta;

type Story = StoryObj<typeof GameHeaderBar>;

export const EventOnly: Story = {
  decorators: [withGame(mockGame)],
};

export const EventAndSection: Story = {
  decorators: [withGame(mockGame)],
};

export const EventAndSession: Story = {
  decorators: [withGame(mockGame)],
};

export const EventSessionAndSection: Story = {
  decorators: [withGame(mockGame)],
};
