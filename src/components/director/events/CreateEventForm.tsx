"use client";

import { useState } from "react";
import { NewBridgeEvent } from "@/db/game-index/schema";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import { MovementCategories } from "@/movement/movement-category";
import FormCardLayout from "@/components/layout/FormCardLayout";

type Props = {
  onAdd: (event: NewBridgeEvent) => void;
};

export default function CreateEventForm({ onAdd }: Props) {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState<
    (typeof MovementCategories)[number]
  >(MovementCategories[0]);

  function handleCreate() {
    const event: NewBridgeEvent = {
      eventDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      eventName,
      director,
      eventType,
    };

    onAdd(event);
  }

  return (
    <FormCardLayout
      header="New Event"
      primaryText="Create"
      secondaryText="Cancel"
      onSecondaryClick={() => {}}
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
    >
      <TextField
        label={`Event Name`}
        value={eventName}
        onChange={setEventName}
      />

      <TextField
        label={`Director Name`}
        value={director}
        onChange={setDirector}
      />

      <SelectField
        label={"Event Type"}
        value={eventType}
        options={MovementCategories}
        onSelect={setEventType}
      />
    </FormCardLayout>
  );
}
