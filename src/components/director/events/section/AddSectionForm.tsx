import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCard from "@/components/common/FormCard";

type Props = {
  onAdd: (name: string) => void;
};

export default function AddSectionForm({ onAdd }: Props) {
  const [name, setName] = useState("");

  return (
    <FormCard
      header={`New Section`}
      primaryText="Create"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name);
      }}
    >
      <TextField label={`Section Name`} value={name} onChange={setName} />
    </FormCard>
  );
}
