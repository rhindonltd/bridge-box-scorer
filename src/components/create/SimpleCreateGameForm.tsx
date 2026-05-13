"use client";

import { useState } from "react";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import Button from "@/components/common/Button";
import { NumberStepperField } from "@/components/common/NumberStepperField";
import { NewBridgeGame } from "@/db/game-index/schema";

const EventTypes = ["Teams/Pairs", "Individual"] as const;
export type EventType = (typeof EventTypes)[number];

export type GameDetails = {
  eventName: string;
  director: string;
  eventType: EventType;
  tables: number;
};

type Props = {
  onCreateGame: (game: NewBridgeGame) => void;
};

export default function SimpleCreateGameForm({ onCreateGame }: Props) {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState<EventType>("Teams/Pairs");
  const [tables, setTables] = useState(1);

  async function handleCreate() {
    onCreateGame({
      eventName,
      director,
      eventType,
      sessionName: "",
      eventDate: new Date().toISOString(),
      status: "JOINABLE",
      sectionName: "",
      tables: tables,
    });
  }

  return (
    <div className="flex-1 flex justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
        className="flex flex-col w-full max-w-md p-4"
      >
        {/* Fields (spread area) */}
        <div className="flex flex-col gap-5 flex-1 justify-center">
          <TextField
            label="Event Name"
            value={eventName}
            onChange={setEventName}
          />

          <TextField
            label="Director Name"
            value={director}
            onChange={setDirector}
          />

          <SelectField
            label="Event Type"
            value={eventType}
            options={EventTypes}
            onSelect={setEventType}
          />

          <NumberStepperField
            label="Tables"
            value={tables}
            onChange={setTables}
            min={1}
          />
        </div>

        {/* Button (bottom) */}
        <div className="mt-auto pt-4">
          <Button type="submit" value="Next" className="w-full" />
        </div>
      </form>
    </div>
  );
}
