import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCardLayout from "@/components/layout/FormCardLayout";

type Props = {
  onAdd: (name: string) => void;
};

export default function AddSectionForm({ onAdd }: Props) {
  const [name, setName] = useState("");

  return (
    <FormCardLayout
      header={`New Section`}
      primaryText="Create"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name);
      }}
    >
      <TextField label={`Section Name`} value={name} onChange={setName} />
    </FormCardLayout>
  );
}
