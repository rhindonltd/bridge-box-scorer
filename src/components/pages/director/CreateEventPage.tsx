import { NewBridgeEvent } from "@/db/game-index/schema";
import EventCard from "@/components/director/events/EventCard";
import CreateEventForm from "@/components/director/events/CreateEventForm";

type Props = {
  events: NewBridgeEvent[];
  onAdd: (event: NewBridgeEvent) => void;
  onClick: (id: number) => void;
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
