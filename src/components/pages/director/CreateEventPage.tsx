import { BridgeEvent } from "@/db/schema";
import EventCard from "@/components/director/events/EventCard";
import CreateEventForm from "@/components/director/events/CreateEventForm";

type Props = {
  events: BridgeEvent[];
  onAdd: (event: BridgeEvent) => void;
  onClick: (id: string) => void;
};

export default function CreateEventPage({ events, onAdd, onClick }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Sections</h1>

      {events.map((event) => (
        <EventCard key={event.id} event={event} onClick={onClick} />
      ))}

      <CreateEventForm onAdd={onAdd} />
    </div>
  );
}
