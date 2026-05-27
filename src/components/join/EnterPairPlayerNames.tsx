import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import { NewPlayer } from "@/db/games/shared/tables/players";
import { PairDirection } from "@/model/common";

interface Props {
  direction: PairDirection;
  onSubmitPair: (player1: NewPlayer, player2: NewPlayer) => void;
}

export default function EnterPairPlayerNames({
  direction,
  onSubmitPair,
}: Props) {
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);

  const player1Label = direction === "NS" ? "North" : "East";
  const player2Label = direction === "NS" ? "South" : "West";

  // const headerColor = direction === "NS" ? "bg-blue-600" : "bg-green-600";

  return (
    <FormCardLayout
      header={`${direction} Players`}
      // headerColor={headerColor}
      primaryText="Continue"
      onSubmit={(e) => {
        if (player1 && player2) {
          e.preventDefault();
          onSubmitPair(player1, player2);
        }
      }}
    >
      <TextField
        label={`${player1Label} Player`}
        value={player1?.firstName ?? ""}
        onChange={(x) =>
          setPlayer1({
            firstName: x,
            lastName: player1?.lastName ?? "",
            nationalId: player1?.nationalId,
          })
        }
      />

      <TextField
        label={`${player2Label} Player`}
        value={player2?.firstName ?? ""}
        onChange={(x) =>
          setPlayer2({
            firstName: x,
            lastName: player2?.lastName ?? "",
            nationalId: player2?.nationalId,
          })
        }
      />
    </FormCardLayout>
  );
}
