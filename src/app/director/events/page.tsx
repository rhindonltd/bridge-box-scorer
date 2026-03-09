'use client'

import { useState, useRef, useEffect } from "react"
import { io, Socket } from "socket.io-client"

export default function DirectorEventsPage() {
    const [eventName, setEventName] = useState("")
    const [directorName, setDirectorName] = useState("")
    const [scoringType, setScoringType] = useState("MP_PAIRS")

    const [eventsCreated, setEventsCreated] = useState<{ id: string; event_name: string; director: string; scoring_type: string; }[]>([])
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        const token = localStorage.getItem("directorToken")
        if (!token) {
            console.error("No director token found")
            return
        }

        const socket = io("http://localhost:3000", {
            auth: { token },
        })

        socketRef.current = socket

        // Listen for confirmation of created events
        socket.on("event:created", (newEvent) => {
            setEventsCreated((prev) => [...prev, newEvent])
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    const createEvent = () => {
        if (!eventName.trim()) return

        const newEvent = {
            event_name: eventName.trim(),
            director: directorName.trim(),
            scoringType: scoringType.trim(),
        }

        // Emit the event to the server
        socketRef.current?.emit("director:createEvent", newEvent)

        setEventName("")
        setDirectorName("")
        setScoringType("MP_PAIRS")
    }

    return (
        <div style={container}>
            <h1>Create New Event</h1>

            <form onSubmit={createEvent} style={form}>
                <input
                    type="text"
                    placeholder="Event name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    style={input}
                />
                <input
                    type="text"
                    placeholder="Director"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    style={input}
                />
                <input
                    type="text"
                    placeholder="MP_PAIRS"
                    value={scoringType}
                    onChange={(e) => setScoringType(e.target.value)}
                    style={input}
                />
                <button style={button}>
                    Create
                </button>
            </form>

            {eventsCreated.length > 0 && (
                <div>
                    <h2>Events Created</h2>
                    <ul>
                        {eventsCreated.map((event) => (
                            <li key={event.id}>
                                {event.event_name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

const container: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "sans-serif"
}

const form: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "260px"
}

const input: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px"
}

const button: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px"
}
