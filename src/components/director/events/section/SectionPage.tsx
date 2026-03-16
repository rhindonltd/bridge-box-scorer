import { BridgeSession, BridgeSection } from "@/db/schema";
import AddSectionForm from "@/components/director/events/section/AddSectionForm";
import SectionCard from "@/components/director/events/section/SectionCard";

type Props = {
  session: BridgeSession;
  sections: BridgeSection[];
  onAdd: (name: string) => void;
  onClick: (id: string) => void;
};

export default function SectionPage({
  session,
  sections,
  onAdd,
  onClick,
}: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">${session.sessionName}</h1>
      <h1 className="text-xl font-bold">Sections</h1>

      {sections.map((session) => (
        <SectionCard key={session.id} section={session} onClick={onClick} />
      ))}

      <AddSectionForm onAdd={onAdd} />
    </div>
  );
}
