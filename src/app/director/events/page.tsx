'use client'

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useDirectorStore } from "@/stores/directorStore"
import { useDirectorSocket } from "@/hooks/useDirectorSocket"
import {DirectorEvent } from "@/types/directorSocket";

export default function DirectorEventsPage() {
    const [eventName, setEventName] = useState("")
    const [directorName, setDirectorName] = useState("")
    const [scoringType, setScoringType] = useState("MP_PAIRS")

    const events = useDirectorStore((state) => state.events)
    const addEvent = useDirectorStore((state) => state.addEvent)
    const updateEvent = useDirectorStore((state) => state.updateEvent)

    const socketRef = useDirectorSocket()

    // Fetch existing events from API
    useSWR<DirectorEvent[]>("/api/director/events", fetcher, {
        onSuccess: (data) => {
            if (data) {
                useDirectorStore.getState().setEvents(data)
            }
        },
    })

    const createEvent = (e: React.FormEvent) => {
        e.preventDefault()
        if (!eventName.trim()) return

        const clientId = Math.random().toString(36).substring(2, 9)

        // Optimistic event with temporary ID
        const tempEvent: DirectorEvent & { clientId: string; pending: boolean } = {
            id: clientId, // temporary id
            clientId,
            pending: true,
            event_name: eventName.trim(),
            director: directorName.trim(),
            scoring_type: scoringType.trim(),
        }

        addEvent(tempEvent)

        const payload = {
            event_name: tempEvent.event_name,
            director: tempEvent.director,
            scoring_type: tempEvent.scoring_type,
        }

        // Emit to server with acknowledgement
        socketRef.current?.emit(
            "director:createEvent",
            payload,
            (response: { success: boolean; error?: string }) => {
                if (!response.success) {
                    updateEvent(clientId, { pending: false, error: response.error ?? "Failed to create event" })
                } else {
                    updateEvent(clientId, { pending: false })
                }
            }
        )

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
                    placeholder="Scoring Type"
                    value={scoringType}
                    onChange={(e) => setScoringType(e.target.value)}
                    style={input}
                />
                <button style={button}>Create</button>
            </form>

            {events.length > 0 && (
                <div>
                    <h2>Events Created</h2>
                    <ul>
                        {events.map((e) => (
                            <li key={e.id ?? e.clientId}>
                                {e.event_name} {e.pending && "(sending...)"} {e.error && `(Error: ${e.error})`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Styles
const container: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "sans-serif",
}

const form: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "260px",
}

const input: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px",
}

const button: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px",
}
