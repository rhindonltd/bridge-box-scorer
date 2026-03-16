import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";

type Props = {
  dbl: string | null;
  onDblSelected: (x: string) => void;
};

export default function Double({ dbl, onDblSelected }: Props) {
  return (
    <Section title="Double">
      <div>
        <ToggleButton
          active={dbl === ""}
          onClick={() => onDblSelected("")}
          fullWidth
        >
          None
        </ToggleButton>
      </div>

      <div className="flex gap-3">
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
