import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CreateGamePage } from "@/app/create/CreateGamePage";

const meta: Meta<typeof CreateGamePage> = {
  title: "App/Create/CreateGamePage",
  component: CreateGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/create",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof CreateGamePage>;

export const Default: Story = {};
