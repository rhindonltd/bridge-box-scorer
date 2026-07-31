import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ClaimDirectorCodeView } from "./ClaimDirectorCodeView";

const meta: Meta<typeof ClaimDirectorCodeView> = {
  title: "Pages/Manage/ClaimDirectorCodeView",
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
  args: {
    gameName: "Monday AM Pairs",
    code: "",
    error: null,
    loading: false,
  },
};

export const PartialCode: Story = {
  args: {
    gameName: "Tuesday PM Individual",
    code: "AB3",
    error: null,
    loading: false,
  },
};

export const FullCode: Story = {
  args: {
    gameName: "Monday AM Pairs",
    code: "XY7K2M",
    error: null,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    gameName: "Monday AM Pairs",
    code: "XY7K2M",
    error: null,
    loading: true,
  },
};

export const WithError: Story = {
  args: {
    gameName: "Monday AM Pairs",
    code: "WRONG1",
    error: "Invalid or expired code",
    loading: false,
  },
};
