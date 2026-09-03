import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import DateField from "./DateField";

const meta: Meta<typeof DateField> = {
  title: "Components/Common/DateField",
  component: DateField,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DateField>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <DateField {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: "Date Played",
    value: "2026-01-15",
  },
};
