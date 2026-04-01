import LevelSection from "../../player/contract/LevelSection";
import SuitSection from "../../player/contract/SuitSection";
import DeclarerSection from "../../player/contract/DeclarerSection";
import DoubleSection from "../../player/contract/DoubleSection";
import { ContractSuit, Doubling, Level } from "../../../model/contract";
import { Direction } from "../../../model/common";

type Props = {
  level: Level | null;
  suit: ContractSuit | null;
  declarer: Direction | null;
  dbl: Doubling | null;
  onLevelSelected: (level: Level) => void;
  onSuitSelected: (suit: ContractSuit) => void;
  onDeclarerSelected: (declarer: Direction) => void;
  onDblSelected: (dbl: Doubling) => void;
};

export function PlayableContract({
  level,
  suit,
  declarer,
  dbl,
  onLevelSelected,
  onSuitSelected,
  onDeclarerSelected,
  onDblSelected,
}: Props) {
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-x-2 gap-y-3 h-full auto-rows-fr">
      <div className="h-full flex">
        <LevelSection
          className="flex-1"
          level={level}
          onLevelSelected={onLevelSelected}
        />
      </div>

      <div className="h-full flex">
        <SuitSection
          className="flex-1"
          suit={suit}
          onSuitSelected={onSuitSelected}
        />
      </div>

      <div className="h-full flex">
        <DeclarerSection
          className="flex-1"
          declarer={declarer}
          onDeclarerSelected={onDeclarerSelected}
        />
      </div>

      <div className="h-full flex">
        <DoubleSection
          className="flex-1"
          dbl={dbl}
          onDblSelected={onDblSelected}
        />
      </div>
    </div>
  );
}
