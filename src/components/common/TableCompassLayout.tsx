import React from "react";

interface Props {
  north: React.ReactNode;
  south: React.ReactNode;
  east: React.ReactNode;
  west: React.ReactNode;
  center?: React.ReactNode;
}

export default function TableCompassLayout({
  north,
  south,
  east,
  west,
  center,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[360px]">
      {/* North */}
      {north}

      {/* Middle Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
        {west}
        {center}
        {east}
      </div>

      {/* South */}
      {south}
    </div>
  );
}
