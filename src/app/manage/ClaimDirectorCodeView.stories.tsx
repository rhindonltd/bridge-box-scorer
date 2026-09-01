import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ClaimDirectorCodeView } from "@/app/manage/ClaimDirectorCodeView";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ClaimDirectorCodeView> = {
  title: "App/Manage/SelectGame/ClaimDirectorCodeView",
  component: ClaimDirectorCodeView,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onCodeChange: fn(),
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ClaimDirectorCodeView>;

export const Empty: Story = {
  decorators: [withGame(mockGame)],
  args: {
    gameName: "Monday AM Pairs",
    code: "",
    error: null,
    loading: false,
  },
};

export const PartialCode: Story = {
  decorators: [withGame(mockGame)],
  args: {
    gameName: "Tuesday PM Individual",
    code: "AB3",
    error: null,
    loading: false,
  },
};

export const FullCode: Story = {
  decorators: [withGame(mockGame)],
  args: {
    gameName: "Monday AM Pairs",
    code: "XY7K2M",
    error: null,
    loading: false,
  },
};

export const Loading: Story = {
  decorators: [withGame(mockGame)],
  args: {
    gameName: "Monday AM Pairs",
    code: "XY7K2M",
    error: null,
    loading: true,
  },
};

export const WithError: Story = {
  decorators: [withGame(mockGame)],
  args: {
    gameName: "Monday AM Pairs",
    code: "WRONG1",
    error: "Invalid or expired code",
    loading: false,
  },
};
