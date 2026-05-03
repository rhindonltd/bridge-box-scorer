import { BridgeSection } from "@/db/game-index/schema";

type Props = {
  section: BridgeSection;
  onClick: (id: string) => void;
};

export default function SectionCard({ section, onClick }: Props) {
  return (
    <div
      className="border rounded-lg p-4 space-y-3 bg-white shadow-sm"
      onClick={() => onClick(section.id!)}
    >
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">{section.sectionName}</h2>
      </div>
    </div>
  );
}
