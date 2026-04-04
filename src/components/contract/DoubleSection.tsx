import Section from "@/components/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";
import { Doubling } from "@/model/contract";

type Props = {
  className?: string;
  dbl: Doubling | null;
  onDblSelected: (x: Doubling) => void;
};

export default function DoubleSection({
  className,
  dbl,
  onDblSelected,
}: Props) {
  return (
    <Section className={className} title="Double">
      <div>
        <ToggleButton
          active={dbl === ""}
          onClick={() => onDblSelected("")}
          fullWidth
        >
          None
        </ToggleButton>
      </div>

      <div className="flex gap-1">
        <ToggleButton
          active={dbl === "X"}
          onClick={() => onDblSelected("X")}
          flex={1}
        >
          X
        </ToggleButton>
        <ToggleButton
          active={dbl === "XX"}
          onClick={() => onDblSelected("XX")}
          flex={1}
        >
          XX
        </ToggleButton>
      </div>
    </Section>
  );
}
