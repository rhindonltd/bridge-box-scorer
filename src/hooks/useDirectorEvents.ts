"use client";

import { useState, useTransition } from "react";
import { useDirectorStore } from "@/stores/directorStore";

import { createBridgeEvent } from "@/db/game-index/actions/create-bridge-event";
import { createBridgeSession } from "@/db/game-index/actions/create-bridge-session";
import { createBridgeSection } from "@/db/game-index/actions/create-bridge-section";

import { findSessionsForEventId, getSectionsForSession } from "@/db/game-index/queries";

import { BridgeSession, BridgeSection } from "@/db/game-index/schema";

const EVENT_TYPES = ["Pairs", "Teams"];

export function useDirectorEvents() {
  const events = useDirectorStore((state) => state.bridgeEvents);

  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);

  const [expandedEvents, setExpandedEvents] = useState<number[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, number[]>
  >({});
  const [sessionsMap, setSessionsMap] = useState<
    Record<number, BridgeSession[]>
  >({});
  const [sectionsMap, setSectionsMap] = useState<
    Record<string, BridgeSection[]>
  >({});

  const [isPending, startTransition] = useTransition();

  /* CREATE EVENT */

  const createEvent = () => {
    if (!eventName.trim()) return;

    startTransition(() => {
      createBridgeEvent({
        eventName,
        eventDate: new Date().toISOString(),
        director,
        eventType,
        createdAt: new Date().toISOString(),
      });

      setEventName("");
      setDirector("");
      setEventType(EVENT_TYPES[0]);
    });
  };

  /* CREATE SESSION */

  const createSession = async (eventId: number, sessionName: string) => {
    if (!sessionName.trim()) return;

    const session = {
      eventId,
      sessionName,
    };

    startTransition(async () => {
      await createBridgeSession(session);

      const updated = await findSessionsForEventId(eventId);

      setSessionsMap((prev) => ({
        ...prev,
        [eventId]: updated,
      }));
    });
  };

  /* CREATE SECTION */

  const createSection = async (sessionId: number, sectionName: string) => {
    if (!sectionName.trim()) return;

    const id = crypto.randomUUID();

    const section = {
      id,
      sessionId,
      sectionName,
      gameDb: `${id}.db`,
      status: 'CREATED'
    };

    startTransition(async () => {
      await createBridgeSection(section);

      const updated = await getSectionsForSession(sessionId);

      setSectionsMap((prev) => ({
        ...prev,
        [sessionId]: updated,
      }));
    });
  };

  /* TOGGLES */

  const toggleEvent = async (eventId: number) => {
    setExpandedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId],
    );

    if (!sessionsMap[eventId]) {
      const sessions = await findSessionsForEventId(eventId);

      setSessionsMap((prev) => ({
        ...prev,
        [eventId]: sessions,
      }));
    }
  };

  const toggleSession = async (eventId: number, sessionIdx: number) => {
    setExpandedSessions((prev) => {
      const expanded = prev[eventId] || [];

      const updated = expanded.includes(sessionIdx)
        ? expanded.filter((i) => i !== sessionIdx)
        : [...expanded, sessionIdx];

      return { ...prev, [eventId]: updated };
    });

    const session = sessionsMap[eventId]?.[sessionIdx];

    if (session && !sectionsMap[session.id]) {
      const sections = await getSectionsForSession(session.id);

      setSectionsMap((prev) => ({
        ...prev,
        [session.id]: sections,
      }));
    }
  };

  return {
    events,

    eventName,
    setEventName,
    director,
    setDirector,
    eventType,
    setEventType,
    scoringTypes: EVENT_TYPES,

    expandedEvents,
    expandedSessions,
    sessionsMap,
    sectionsMap,

    toggleEvent,
    toggleSession,

    createEvent,
    createSession,
    createSection,

    isPending,
  };
}
