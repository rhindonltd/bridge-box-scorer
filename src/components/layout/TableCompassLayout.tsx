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
    <div className="flex flex-col items-center gap-5 w-full max-w-[360px] mx-auto">
      {/* North */}
      {north}

      {/* Middle Row. `min-w-0` on the side cells lets the 1fr columns actually
          shrink below their content's intrinsic width, so long player names
          wrap/truncate within the card instead of pushing East off the edge on
          narrow phones. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
        <div className="min-w-0">{west}</div>
        {center}
        <div className="min-w-0">{east}</div>
      </div>

      {/* South */}
      {south}
    </div>
  );
}
