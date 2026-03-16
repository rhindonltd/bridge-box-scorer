import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";

type Props = {
  declarer: string | null;
  onDeclarerSelected: (x: string) => void;
};

export default function Declarer({ declarer, onDeclarerSelected }: Props) {
  return (
    <Section title="Declarer" gridCols={2}>
      {["N", "S", "E", "W"].map((d) => (
        <ToggleButton
          key={d}
          active={declarer === d}
          onClick={() => onDeclarerSelected(d)}
        >
          {d}
        </ToggleButton>
      ))}
    </Section>
  );
}
