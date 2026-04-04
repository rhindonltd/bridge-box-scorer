import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCardLayout from "@/components/layout/FormCardLayout";

interface Props {
  direction: "NS" | "EW";
  submitPlayerNames: (player1: string, player2: string) => void;
}

export default function EnterPlayerNames({
  direction,
  submitPlayerNames,
}: Props) {
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");

  const player1Label = direction === "NS" ? "North" : "East";
  const player2Label = direction === "NS" ? "South" : "West";

  const headerColor = direction === "NS" ? "bg-blue-600" : "bg-green-600";

  return (
    <FormCardLayout
      header={`${direction} Players`}
      headerColor={headerColor}
      primaryText="Continue"
      onSubmit={(e) => {
        e.preventDefault();
        submitPlayerNames(player1Name, player2Name);
      }}
    >
      <TextField
        label={`${player1Label} Player`}
        value={player1Name}
        onChange={setPlayer1Name}
      />

      <TextField
        label={`${player2Label} Player`}
        value={player2Name}
        onChange={setPlayer2Name}
      />
    </FormCardLayout>
  );
}
