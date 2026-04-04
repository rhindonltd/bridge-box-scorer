import Section from "@/components/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";
import { ContractSuit, ContractSuits } from "@/model/contract";

type Props = {
  className?: string;
  suit: ContractSuit | null;
  onSuitSelected: (x: ContractSuit) => void;
};

export default function SuitSection({
  className,
  suit,
  onSuitSelected,
}: Props) {
  return (
    <Section className={className} title="Suit" gridCols={3}>
      {ContractSuits.map((s) => (
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
