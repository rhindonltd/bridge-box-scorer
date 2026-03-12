"use client";

import { useState, useTransition } from "react";
import { useDirectorStore } from "@/stores/directorStore";

import AddSessionForm from "@/components/director/events/AddSessionForm";
import AddSectionForm from "@/components/director/events/AddSectionForm";
import { createBridgeEvent } from "@/db/actions/create-bridge-event";
import { createBridgeSession } from "@/db/actions/create-bridge-session";
import { createBridgeSection } from "@/db/actions/create-bridge-section";
import { BridgeSection, BridgeSession } from "@/db/schema";
import { findSessionsForEventId, getSectionsForSession } from "@/db/queries";

const SCORING_TYPES = ["MP_PAIRS", "IMP_TEAMS", "TOTAL_POINTS"];

export default function DirectorPage() {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [scoringType, setScoringType] = useState(SCORING_TYPES[0]);
  const events = useDirectorStore((state) => state.bridgeEvents);

  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, number[]>>({});
  const [sessionsMap, setSessionsMap] = useState<Record<string, BridgeSession[]>>({});
  const [sectionsMap, setSectionsMap] = useState<Record<string, BridgeSection[]>>({});
  const [isPending, startTransition] = useTransition();

  // --- CREATE EVENT ---
  const handleCreateEvent = () => {
    if (!eventName.trim()) return;

    startTransition(() => {
      createBridgeEvent({
        id: crypto.randomUUID(),
        eventName,
        eventDate: new Date().toISOString(),
        director,
        scoringType,
        createdAt: new Date().toISOString(),
      });
      setEventName("");
      setDirector("");
      setScoringType(SCORING_TYPES[0]);
    });
  };

  // --- CREATE SESSION ---
  const handleCreateSession = async (eventId: string, sessionName: string) => {
    if (!sessionName.trim()) return;

    const session = {
      id: crypto.randomUUID(),
      eventId,
      sessionName,
    };

    startTransition(async () => {
      await createBridgeSession(session);
      // Reload sessions for this event
      const updatedSessions = await findSessionsForEventId(eventId);
      setSessionsMap((prev) => ({ ...prev, [eventId]: updatedSessions }));
    });
  };

  // --- CREATE SECTION ---
  const handleCreateSection = async (sessionId: string, sectionName: string) => {
    if (!sectionName.trim()) return;

    const section = {
      id: crypto.randomUUID(),
      sessionId,
      sectionName,
      started: false,
      finished: false,
    };

    startTransition(async () => {
      await createBridgeSection(section);
      // Reload sections for this session
      const updatedSections = await getSectionsForSession(sessionId);
      setSectionsMap((prev) => ({ ...prev, [sessionId]: updatedSections }));
    });
  };

  // --- Accordion toggles ---
  const toggleEvent = async (eventId: string) => {
    setExpandedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );

    // Load sessions if not already loaded
    if (!sessionsMap[eventId]) {
      const sessions = await findSessionsForEventId(eventId);
      setSessionsMap((prev) => ({ ...prev, [eventId]: sessions }));
    }
  };

  const toggleSession = async (eventId: string, sessionIdx: number) => {
    setExpandedSessions((prev) => {
      const expanded = prev[eventId] || [];
      const newExpanded = expanded.includes(sessionIdx)
        ? expanded.filter((i) => i !== sessionIdx)
        : [...expanded, sessionIdx];
      return { ...prev, [eventId]: newExpanded };
    });

    const session = sessionsMap[eventId]?.[sessionIdx];
    if (session && !sectionsMap[session.id]) {
      const sections = await getSectionsForSession(session.id);
      setSectionsMap((prev) => ({ ...prev, [session.id]: sections }));
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto font-sans flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center">Bridge Events</h1>

      {/* Create Event */}
      <div className="flex flex-col gap-2 border p-3 rounded bg-gray-100">
        <input
          type="text"
          placeholder="Event Name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Director Name"
          value={director}
          onChange={(e) => setDirector(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={scoringType}
          onChange={(e) => setScoringType(e.target.value)}
          className="border p-2 rounded"
        >
          {SCORING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreateEvent}
          disabled={isPending}
          className="bg-green-500 text-white p-2 rounded mt-1 disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Event"}
        </button>
      </div>

      {/* Events List */}
      {events.map((ev) => (
        <div
          key={ev.id}
          className="border rounded shadow-sm p-3 flex flex-col gap-2"
        >
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleEvent(ev.id)}
          >
            <span className="font-medium">{ev.eventName}</span>
          </div>

          {expandedEvents.includes(ev.id) && (
            <div className="ml-4 flex flex-col gap-2 mt-2">
              {(sessionsMap[ev.id] || []).map((sess, sIdx) => (
                <div
                  key={sess.id ?? sIdx}
                  className="border rounded p-2 flex flex-col gap-2"
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleSession(ev.id, sIdx)}
                  >
                    <span className="font-medium">
                      {sess.sessionName || `Session ${sIdx + 1}`}
                    </span>
                  </div>

                  {expandedSessions[ev.id]?.includes(sIdx) && (
                    <div className="ml-4 flex flex-col gap-2">
                      {(sectionsMap[sess.id] || []).map((sec) => (
                        <div
                          key={sec.id}
                          className="flex justify-between items-center p-1"
                        >
                          <span>{sec.sectionName}</span>
                        </div>
                      ))}

                      <AddSectionForm
                        onAdd={(name) => handleCreateSection(sess.id, name)}
                      />
                    </div>
                  )}
                </div>
              ))}

              <AddSessionForm
                onAdd={(name) => handleCreateSession(ev.id, name)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}