"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useLobbyStore } from "@/stores/lobbyStore";

import SelectEvent from "@/components/lobby/SelectEvent";
import SelectSession from "@/components/lobby/SelectSession";
import SelectSection from "@/components/lobby/SelectSection";
import SelectTable from "@/components/lobby/SelectTable";
import { useLobbySocket } from "@/hooks/useLobbySocket";

import { Event } from "@/model/event";
import { Section } from "@/model/section";
import { Session } from "@/model/session";
import EnterPlayerNames from "@/components/lobby/EnterPlayerNames";
import RoundInfo from "@/components/lobby/RoundInfo";
import EnterContract from "@/components/lobby/EnterContract";

export default function EventLobby() {
  const socketRef = useLobbySocket();

  const {
    eventId,
    sessionId,
    sectionId,
    tableId,
    direction,
    player1,
    selectEvent,
    selectSession,
    selectSection,
    selectTableAndDirection,
    selectPlayers,
  } = useLobbyStore();

  const { data: events } = useSWR<Event[]>("/api/events", fetcher);

  const { data: sessions } = useSWR<Session[]>(
    eventId ? `/api/events/${eventId}/sessions` : null,
    fetcher,
  );

  const { data: sections } = useSWR<Section[]>(
    sessionId ? `/api/sessions/${sessionId}/sections` : null,
    fetcher,
  );

  const selectedSection = sections?.find((s) => s.id === sectionId);

  return (
    <div>
      {player1 && (
        // <RoundInfo roundNumber={1} tableNumber={2} boards={[1,2,3]} players={{
        //     N: { firstName: 'David', lastName: 'Collier' },
        //     S: { firstName: 'Jacqui', lastName: 'Collier' },
        //     E: { firstName: 'Peter', lastName: 'Collier' },
        //     W: { firstName: 'Andrew', lastName: 'Robson' },
        // }} onEnterRound = {() => {}} />

        <EnterContract />
      )}

      {tableId && direction && !player1 && (
        <EnterPlayerNames
          direction={direction}
          submitPlayerNames={selectPlayers}
        />
      )}

      {!eventId && (
        <SelectEvent events={events ?? []} selectEvent={selectEvent} />
      )}

      {!sessionId && (
        <SelectSession
          sessions={sessions ?? []}
          selectSession={selectSession}
        />
      )}

      {!sectionId && (
        <SelectSection
          sections={sections ?? []}
          selectSection={selectSection}
        />
      )}

      {selectedSection && !tableId && (
        <SelectTable
          tables={selectedSection.bridge_tables}
          selectTable={selectTableAndDirection}
        />
      )}
    </div>
  );
}
