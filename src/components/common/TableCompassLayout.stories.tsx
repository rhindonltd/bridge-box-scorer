import React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TableCompassLayout from "./TableCompassLayout";

const meta: Meta<typeof TableCompassLayout> = {
  title: "Components/Common/TableCompassLayout",
  component: TableCompassLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TableCompassLayout>;

// 🔹 Default story with simple directional content
export const Default: Story = {
  args: {
    north: (
      <div className="w-16 h-16 bg-blue-500 flex items-center justify-center text-white font-bold rounded-full">
        N
      </div>
    ),
    south: (
      <div className="w-16 h-16 bg-red-500 flex items-center justify-center text-white font-bold rounded-full">
        S
      </div>
    ),
    east: (
      <div className="w-16 h-16 bg-green-500 flex items-center justify-center text-white font-bold rounded-full">
        E
      </div>
    ),
    west: (
      <div className="w-16 h-16 bg-yellow-500 flex items-center justify-center text-white font-bold rounded-full">
        W
      </div>
    ),
    center: (
      <div className="w-16 h-16 bg-gray-700 flex items-center justify-center text-white font-bold rounded-full">
        C
      </div>
    ),
  },
};

// 🔹 Example without center content
export const WithoutCenter: Story = {
  args: {
    north: (
      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
        N
      </div>
    ),
    south: (
      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
        S
      </div>
    ),
    east: (
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
        E
      </div>
    ),
    west: (
      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
        W
      </div>
    ),
  },
};

// 🔹 Example with text labels in center
export const CenterLabel: Story = {
  args: {
    north: <div>NORTH</div>,
    south: <div>SOUTH</div>,
    east: <div>EAST</div>,
    west: <div>WEST</div>,
    center: <div className="font-bold text-lg">Table</div>,
  },
};
