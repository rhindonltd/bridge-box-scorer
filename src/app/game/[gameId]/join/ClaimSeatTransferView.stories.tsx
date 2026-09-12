import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ClaimSeatTransferView } from "@/app/game/[gameId]/join/ClaimSeatTransferView";

const meta: Meta<typeof ClaimSeatTransferView> = {
  title: "App/Join/Game/ClaimSeatTransferView",
  component: ClaimSeatTransferView,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    onCodeChange: fn(),
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ClaimSeatTransferView>;

export const Empty: Story = {
  args: { code: "", error: null, loading: false },
};

export const PartialCode: Story = {
  args: { code: "AB3", error: null, loading: false },
};

export const FullCode: Story = {
  args: { code: "XY7K2M", error: null, loading: false },
};

export const Loading: Story = {
  args: { code: "XY7K2M", error: null, loading: true },
};

export const WithError: Story = {
  args: {
    code: "OLD222",
    error: "Code has expired",
    loading: false,
  },
};
