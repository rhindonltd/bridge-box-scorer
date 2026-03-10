import {Session} from "@/model/session";

interface SelectSessionProps {
    sessions: Session[];
    selectSession: (sessionId: string) => void;
}

export default function SelectSession({ sessions, selectSession }: SelectSessionProps) {
    return (<>
        {/*<button onClick={() => setSelectedEvent(null)}>*/}
        {/*    ← Back to Events*/}
        {/*</button>*/}

        <h2>Sessions</h2>

        {sessions.length === 0 ? (
            <p>No sessions available.</p>
        ) : (
            <ul>
                {sessions.map((session) => (
                    <li key={session.id}>
                        <button onClick={() => selectSession(session.id)}>
                            {session.session_name}
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </>);
}