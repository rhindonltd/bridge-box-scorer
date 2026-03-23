import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";
import {Direction, Directions} from "@/model/common";

type Props = {
  className?: string;
  declarer: Direction | null;
  onDeclarerSelected: (x: Direction) => void;
};

export default function DeclarerSection({ className, declarer, onDeclarerSelected }: Props) {
  return (
    <Section className={className} title="Declarer" gridCols={2}>
      {Directions.map((d) => (
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
