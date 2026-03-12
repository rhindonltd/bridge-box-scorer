import { useState } from "react";

const MOVEMENTS = ["Mitchell", "Howell", "Individual"];

export default function AddSectionForm({ onAdd }: { onAdd: (name: string, movement: string) => void }) {
  const [name, setName] = useState("");
  const [movement, setMovement] = useState(MOVEMENTS[0]);
  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        placeholder="Section Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded flex-1"
      />
      <select
        value={movement}
        onChange={(e) => setMovement(e.target.value)}
        className="border p-2 rounded"
      >
        {MOVEMENTS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          onAdd(name, movement);
          setName("");
          setMovement(MOVEMENTS[0]);
        }}
        className="bg-purple-500 text-white p-2 rounded"
      >
        Add Section
      </button>
    </div>
  );
}
