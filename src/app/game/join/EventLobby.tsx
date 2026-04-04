// "use client";
//
// import useSWR from "swr";
// import { fetcher } from "@/lib/fetcher";
// import { useLobbyStore } from "@/stores/lobbyStore";
//
// import { useLobbySocket } from "@/hooks/useLobbySocket";
//
// import { BridgeEvent, BridgeSection, BridgeSession } from "@/db/schema";
// import EnterPlayerNames from "@/components/join/EnterPlayerNames";
// import SelectEvent from "@/components/join/SelectEvent";
// import SelectSession from "@/components/join/SelectSession";
// import SelectSection from "@/components/join/SelectSection";
// import EnterContractPage from "@/components/pages/player/EnterContractPage";
//
// export default function EventLobby() {
//   const socketRef = useLobbySocket();
//
//   const {
//     eventId,
//     sessionId,
//     sectionId,
//     tableId,
//     direction,
//     player1,
//     selectEvent,
//     selectSession,
//     selectSection,
//     selectPlayers,
//   } = useLobbyStore();
//
//   const { data: events } = useSWR<BridgeEvent[]>("/api/events", fetcher);
//
//   const { data: sessions } = useSWR<BridgeSession[]>(
//     eventId ? `/api/events/${eventId}/sessions` : null,
//     fetcher,
//   );
//
//   const { data: sections } = useSWR<BridgeSection[]>(
//     sessionId ? `/api/sessions/${sessionId}/sections` : null,
//     fetcher,
//   );
//
//   const selectedSection = sections?.find((s) => s.id === sectionId);
//
//   return (
//     <div>
//       {player1 && (
//         // <RoundInfo roundNumber={1} tableNumber={2} boards={[1,2,3]} players={{
//         //     N: { firstName: 'David', lastName: 'Collier' },
//         //     S: { firstName: 'Jacqui', lastName: 'Collier' },
//         //     E: { firstName: 'Peter', lastName: 'Collier' },
//         //     W: { firstName: 'Andrew', lastName: 'Robson' },
//         // }} onEnterRound = {() => {}} />
//
//         <EnterContractPage
//           round={1}
//           table={2}
//           board={2}
//           roundBoards={[1, 2, 3]}
//           onOk={() => {}}
//         />
//       )}
//
//       {tableId && direction && !player1 && (
//         <EnterPlayerNames
//           direction={direction}
//           submitPlayerNames={selectPlayers}
//         />
//       )}
//
//       {!eventId && (
//         <SelectEvent events={events ?? []} selectEvent={selectEvent} />
//       )}
//
//       {!sessionId && (
//         <SelectSession
//           sessions={sessions ?? []}
//           selectSession={selectSession}
//         />
//       )}
//
//       {!sectionId && (
//         <SelectSection
//           sections={sections ?? []}
//           selectSection={selectSection}
//         />
//       )}
//
//       {/*{selectedSection && !tableId && (*/}
//       {/*  <SelectTable*/}
//       {/*    tables={selectedSection.bridge_tables}*/}
//       {/*    selectTable={selectTableAndDirection}*/}
//       {/*  />*/}
//       {/*)}*/}
//     </div>
//   );
// }
