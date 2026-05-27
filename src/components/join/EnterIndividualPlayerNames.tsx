import { useState } from "react";
import TextField from "@/components/common/TextField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import { Direction } from "@/model/common";
import { NewPlayer } from "@/db/games/shared/tables/players";

interface Props {
  direction: Direction;
  onSubmitPlayer: (player: NewPlayer) => void;
}

export default function EnterPairPlayerNames({
  direction,
  onSubmitPlayer,
}: Props) {
  const [player, setPlayer] = useState<NewPlayer | null>(null);

  return (
    <FormCardLayout
      header={`${direction} Players`}
      // headerColor={headerColor}
      primaryText="Continue"
      onSubmit={(e) => {
        if (player) {
          e.preventDefault();
          onSubmitPlayer(player);
        }
      }}
    >
      <TextField
        label={`${direction} Player`}
        value={player?.firstName ?? ""}
        onChange={(x) =>
          setPlayer({
            firstName: x,
            lastName: player?.lastName ?? "",
            nationalId: player?.nationalId,
          })
        }
      />
    </FormCardLayout>
  );
}
