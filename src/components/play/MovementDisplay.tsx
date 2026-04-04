import React from "react";

type Direction = "NS" | "EW";

interface Movement {
  direction: Direction;
  action: "move" | "stay" | "sitout";
  table?: number;
}

interface MovementDisplayProps {
  roundNumber: number;
  movements: Movement[];
}

export default function MovementDisplay({
  roundNumber,
  movements,
}: MovementDisplayProps) {
  const renderMovement = (m: Movement) => {
    if (m.action === "move") {
      return `${m.direction} go to Table ${m.table}`;
    }

    if (m.action === "stay") {
      return `${m.direction} stay at this table`;
    }

    if (m.action === "sitout") {
      return `${m.direction} sit out`;
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 bg-slate-100 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">End of Round {roundNumber}</h2>

      <div className="flex flex-col gap-3 w-full">
        {movements.map((m, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
          >
            <span className="font-semibold">{m.direction}</span>
            <span className="text-right">{renderMovement(m)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
