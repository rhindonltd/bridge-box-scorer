import { BridgeEvent } from "@/db/schema";

type Props = {
  event: BridgeEvent;
  onClick: (id: string) => void;
};

export default function EventCard({ event, onClick }: Props) {
  return (
    <div
      className="border rounded-lg p-4 space-y-3 bg-white shadow-sm"
      onClick={() => onClick(event.id)}
    >
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">{event.eventName}</h2>
      </div>
    </div>
  );
}
