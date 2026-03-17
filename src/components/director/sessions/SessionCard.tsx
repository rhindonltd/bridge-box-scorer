import { BridgeSession } from "@/db/schema";

type Props = {
  session: BridgeSession;
  onClick: (id: string) => void;
};

export default function SessionCard({ session, onClick }: Props) {
  return (
    <div
      className="border rounded-lg p-4 space-y-3 bg-white shadow-sm"
      onClick={() => onClick(session.id)}
    >
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">{session.sessionName}</h2>
      </div>
    </div>
  );
}
