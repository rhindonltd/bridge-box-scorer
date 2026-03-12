import { useState } from "react";

export default function AddSessionForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        placeholder="New Session Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded flex-1"
      />
      <button
        onClick={() => {
          onAdd(name);
          setName("");
        }}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Add Session
      </button>
    </div>
  );
}
