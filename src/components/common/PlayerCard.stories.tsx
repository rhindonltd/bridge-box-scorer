import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import PlayerCard from "./PlayerCard";

const meta: Meta<typeof PlayerCard> = {
  title: "Components/Common/PlayerCard",
  component: PlayerCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PlayerCard>;

export const Default: Story = {
  args: {
    label: "N",
    player: {
      firstName: "Peter",
      lastName: "Collier",
    },
  },
};

export const NoPlayer: Story = {
  args: {
    label: "N",
  },
};
