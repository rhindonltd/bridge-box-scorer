import { BridgeEvent } from "@/db/schema";

interface SelectEventProps {
  events: BridgeEvent[];
  selectEvent: (eventId: string) => void;
}

export default function SelectEvent({ events, selectEvent }: SelectEventProps) {
  return (
    <>
      <h2>Events</h2>

      {events.length === 0 ? (
        <p>No events yet. Waiting for director...</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <button onClick={() => selectEvent(event.id)}>
                {event.eventName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
