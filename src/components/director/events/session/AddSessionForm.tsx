import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCard from "@/components/common/FormCard";

type Props = {
  onAdd: (name: string) => void;
};

export default function AddSessionForm({ onAdd }: Props) {
  const [name, setName] = useState("");

  return (
    <FormCard
      header={`New Session`}
      primaryText="Create"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name);
      }}
    >
      <TextField label={`Session Name`} value={name} onChange={setName} />
    </FormCard>
  );
}
