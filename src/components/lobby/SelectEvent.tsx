import {Event} from "@/model/event";

interface SelectEventProps {
    events: Event[];
    selectEvent: (eventId: string) => void;
}

export default function SelectEvent({ events, selectEvent }: SelectEventProps) {
    return (<>
        <h2>Events</h2>

        {events.length === 0 ? (
            <p>No events yet. Waiting for director...</p>
        ) : (
            <ul>
                {events.map((event) => (
                    <li key={event.id}>
                        <button onClick={() => selectEvent(event.id)}>
                            {event.event_name}
                        </button>
                    </li>
                ))}
            </ul>
        )}</>);
}
