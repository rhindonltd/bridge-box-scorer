"use client";

import { useState } from "react";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import Button from "@/components/common/Button";
import { NumberStepperField } from "@/components/common/NumberStepperField";
import { ToggleField } from "@/components/common/ToggleField";
import { NewBridgeGame } from "@/db/game-index/schema";
import { GameType } from "../../db/games/types/game-type";

type Props = {
  onCreateGame: (game: NewBridgeGame) => void;
};

export default function SimpleCreateGameForm({ onCreateGame }: Props) {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [gameType, setGameType] = useState<GameType>("PAIRS");
  const [tables, setTables] = useState(1);
  const [leadCardRequired, setLeadCardRequired] = useState(true);

  async function handleCreate() {
    onCreateGame({
      eventName,
      director,
      gameType,
      sessionName: "",
      eventDate: new Date().toISOString(),
      status: "JOINABLE",
      sectionName: "",
      tables: tables,
      leadCardRequired,
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
            value={gameType}
            options={[
              { label: "Pairs", value: "PAIRS" },
              { label: "Teams", value: "TEAMS" },
            ]}
            onSelect={setGameType}
          />

          <NumberStepperField
            label="Tables"
            value={tables}
            onChange={setTables}
            min={1}
          />

          <ToggleField
            label="Record Opening Lead"
            value={leadCardRequired}
            offLabel="No"
            onLabel="Yes"
            onSwitch={() => setLeadCardRequired((v) => !v)}
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
