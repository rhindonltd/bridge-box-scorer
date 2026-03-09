'use client'

import { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"

type Event = {
    id: string
    event_name: string
}

export default function EventLobby() {
    const [events, setEvents] = useState<Event[]>([])
    const socketRef = useRef<Socket | null>(null)

    // Fetch initial events
    useEffect(() => {
        fetch("/api/events")
            .then((res) => res.json())
            .then((data: Event[]) => setEvents(data))
    }, [])

    // Connect to Socket.IO for real-time updates
    useEffect(() => {
        const socket = io("http://localhost:3000")
        socketRef.current = socket

        // Listen for new events pushed by the director
        socket.on("event:created", (newEvent: Event) => {
            setEvents((prev) => [...prev, newEvent])
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
            <h1>Available Events</h1>
            {events.length === 0 ? (
                <p>No events yet. Waiting for director to create one...</p>
            ) : (
                <ul>
                    {events.map((event) => (
                        <li key={event.id}>
                            {event.event_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
