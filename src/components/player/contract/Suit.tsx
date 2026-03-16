import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";

type Props = {
  suit: string | null;
  onSuitSelected: (x: string) => void;
};

export default function Suit({ suit, onSuitSelected }: Props) {
  return (
    <Section title="Suit" gridCols={3}>
      {["♣", "♦", "♥", "♠", "NT"].map((s) => (
        <ToggleButton
          key={s}
          active={suit === s}
          onClick={() => onSuitSelected(s)}
        >
          {s}
        </ToggleButton>
      ))}
    </Section>
  );
}
