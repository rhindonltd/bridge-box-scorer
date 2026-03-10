'use client'

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useLobbyStore } from "@/stores/lobbyStore"

import SelectEvent from "@/components/lobby/SelectEvent"
import SelectSession from "@/components/lobby/SelectSession"
import SelectSection from "@/components/lobby/SelectSection"
import SelectTable from "@/components/lobby/SelectTable"
import { useLobbySocket } from "@/hooks/useLobbySocket";

import { Event } from "@/model/event"
import { Section } from "@/model/section"
import { Session } from "@/model/session";
import EnterPlayerNames from "@/components/lobby/EnterPlayerNames";

export default function EventLobby() {

    const socketRef = useLobbySocket()

    const {
        eventId,
        sessionId,
        sectionId,
        tableId,
        direction,
        selectEvent,
        selectSession,
        selectSection,
        selectTable,
        selectDirection
    } = useLobbyStore()

    const { data: events } = useSWR<Event[]>("/api/events", fetcher)

    const { data: sessions } = useSWR<Session[]>(
        eventId ? `/api/events/${eventId}/sessions` : null,
        fetcher
    )

    const { data: sections } = useSWR<Section[]>(
        sessionId ? `/api/sessions/${sessionId}/sections` : null,
        fetcher
    )

    const selectedSection = sections?.find(s => s.id === sectionId)

    return (
        <div style={{ padding: 20 }}>
            {tableId && direction && (
                <EnterPlayerNames direction={direction} submitPlayerNames={(x, y) => {

                }} />
            )}

            {!eventId && (
                <SelectEvent events={events ?? []} selectEvent={selectEvent} />
            )}

            {eventId && !sessionId && (
                <SelectSession sessions={sessions ?? []} selectSession={selectSession} />
            )}

            {sessionId && !sectionId && (
                <SelectSection sections={sections ?? []} selectSection={selectSection} />
            )}

            {sectionId && selectedSection && (
                <SelectTable
                    tables={selectedSection.bridge_tables}
                    selectTable={(table, direction) => {
                        selectTable(table);
                        selectDirection(direction)
                    }}
                />
            )}
        </div>
    )
}