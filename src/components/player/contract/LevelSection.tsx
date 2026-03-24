"use client";

import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";
import { Level, Levels } from "@/model/contract";

type Props = {
  className?: string;
  level: Level | null;
  onLevelSelected: (x: Level) => void;
};

export default function LevelSection({
  className,
  level,
  onLevelSelected,
}: Props) {
  return (
    <Section className={className} title="Level" gridCols={4}>
      {Levels.map((l) => (
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
