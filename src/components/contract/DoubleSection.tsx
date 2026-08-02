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
    <Section className={className} title="Double" gridCols={2}>
      <div className="col-span-2">
        <ToggleButton
          active={dbl === ""}
          onClick={() => onDblSelected("")}
          fullWidth
        >
          None
        </ToggleButton>
      </div>
      <ToggleButton
        active={dbl === "X"}
        onClick={() => onDblSelected("X")}
        fullWidth
      >
        X
      </ToggleButton>
      <ToggleButton
        active={dbl === "XX"}
        onClick={() => onDblSelected("XX")}
        fullWidth
      >
        XX
      </ToggleButton>
    </Section>
  );
}
