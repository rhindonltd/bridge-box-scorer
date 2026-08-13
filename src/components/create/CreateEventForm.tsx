"use client";

import { useState } from "react";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import Button from "@/components/common/Button";
import { GameType } from "@/db/games/types/game-type";
import NumberStepper from "@/components/common/NumberStepper";

export type EventDetails = {
  eventName: string;
  director: string;
  eventType: GameType;
  sessions: number;
};

type Props = {
  onNext: (event: EventDetails) => void;
};

export default function CreateEventForm({ onNext }: Props) {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState<GameType>("PAIRS");
  const [sessions, setSessions] = useState(1);

  function handleCreate() {
    onNext({
      eventName,
      director,
      eventType,
      sessions,
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
            options={[
              { label: "Pairs/Teams", value: "PAIRS" },
              { label: "Teams", value: "TEAMS" },
            ]}
            onSelect={setEventType}
          />

            <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-600">Sessions</label>
                <NumberStepper value={sessions} onChange={setSessions} min={1} />
            </div>
        </div>

        {/* Button (bottom) */}
        <div className="mt-auto pt-4">
          <Button type="submit" value="Next" className="w-full" />
        </div>
      </form>
    </div>
  );
}
