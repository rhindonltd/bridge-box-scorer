import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  NumberStepperField,
  Props,
} from "@/components/common/NumberStepperField";

const meta: Meta<typeof NumberStepperField> = {
  title: "Components/Common/NumberStepperField",
  component: NumberStepperField,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof NumberStepperField>;

// 🔁 Interactive wrapper so the component actually updates
const StatefulWrapper = (args: Props) => {
  const [value, setValue] = useState(args.value ?? 0);

  return <NumberStepperField {...args} value={value} onChange={setValue} />;
};

// ✅ Default
export const Default: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    label: "Label",
    value: 0,
    min: 0,
  },
};
