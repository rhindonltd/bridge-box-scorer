"use client";

import { useState } from "react";
import { BridgeEvent } from "@/db/schema";
import TextField from "@/components/common/TextField";
import FormCard from "@/components/common/FormCard";
import SelectField from "@/components/common/SelectField";

type Props = {
  onAdd: (event: BridgeEvent) => void;
};

const eventTypes = ["Pairs", "Teams"];

export default function CreateEventForm({ onAdd }: Props) {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState(eventTypes[0]);

  function handleCreate() {
    const event: BridgeEvent = {
      id: crypto.randomUUID(),
      eventDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      eventName,
      director,
      eventType,
    };

    onAdd(event);
  }

  return (
    <FormCard
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
        options={eventTypes}
        onSelect={setEventType}
      />
    </FormCard>
  );
}
