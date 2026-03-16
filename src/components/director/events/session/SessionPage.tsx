import { BridgeEvent, BridgeSession } from "@/db/schema";
import SessionCard from "@/components/director/events/session/SessionCard";
import AddSessionForm from "@/components/director/events/session/AddSessionForm";

type Props = {
  event: BridgeEvent;
  sessions: BridgeSession[];
  onAdd: (name: string) => void;
  onClick: (id: string) => void;
};

export default function SessionPage({
  event,
  sessions,
  onAdd,
  onClick,
}: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">${event.eventName}</h1>
      <h1 className="text-xl font-bold">Sessions</h1>

      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onClick={onClick} />
      ))}

      <AddSessionForm onAdd={onAdd} />
    </div>
  );
}
