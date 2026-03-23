"use client";

import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";

type Props = {
  level: number | null;
  onLevelSelected: (x: number) => void;
};

export default function Level({ level, onLevelSelected }: Props) {
  return (
    <Section title="Level" gridCols={4}>
      {[1, 2, 3, 4, 5, 6, 7].map((l) => (
        <ToggleButton
          key={l}
          active={level === l}
          onClick={() => onLevelSelected(l)}
        >
          {l}
        </ToggleButton>
      ))}
    </Section>
  );
}
