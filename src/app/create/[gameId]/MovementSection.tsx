import { PairMovementSpec } from "@/db/movements/schema";
import { MovementCard } from "./MovementCard";
import { TeamMovementSpec } from "@/db/movements/schema";

type Props = {
  movements: (PairMovementSpec | TeamMovementSpec)[];
  type: string;
  onSelect: (id: number, type: string, name: string) => void;
};

export function MovementSection({ movements, type, onSelect }: Props) {
  if (movements.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {movements.map((movement) => (
          <MovementCard
            key={`${movement.type}-${movement.id}`}
            movement={movement}
            onSelected={(id) => onSelect(id, type, movement.name)}
          />
        ))}
      </div>
    </div>
  );
}
