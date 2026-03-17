import { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterContractPage from "@/components/pages/player/EnterContractPage";

const meta: Meta<typeof EnterContractPage> = {
  title: "Pages/Player/Contract/EnterContract",
  component: EnterContractPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterContractPage>;

export const Default: Story = {};
