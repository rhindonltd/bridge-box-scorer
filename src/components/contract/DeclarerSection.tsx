import { ToggleButton } from "@/components/common/ToggleButton";
import { Direction } from "@/model/common";

type Props = {
  className?: string;
  declarer: Direction | null;
  onDeclarerSelected: (x: Direction) => void;
};

const DISPLAY_ORDER: Direction[] = ["N", "S", "E", "W"];

export default function DeclarerSection({
  className,
  declarer,
  onDeclarerSelected,
}: Props) {
  return (
    <div
      className={`border border-gray-300 bg-gray-50 flex flex-col h-full ${className ?? ""}`}
    >
      <div className="text-sm font-bold bg-blue-600 text-white px-2 py-1 mb-1">
        Declarer
      </div>
      <div className="grid grid-cols-2 gap-1 p-1">
        {DISPLAY_ORDER.map((d) => (
          <ToggleButton
            key={d}
            active={declarer === d}
            onClick={() => onDeclarerSelected(d)}
          >
            {d}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}
