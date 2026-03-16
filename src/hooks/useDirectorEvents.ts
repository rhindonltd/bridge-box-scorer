"use client";

import { useState, useTransition } from "react";
import { useDirectorStore } from "@/stores/directorStore";

import { createBridgeEvent } from "@/db/actions/create-bridge-event";
import { createBridgeSession } from "@/db/actions/create-bridge-session";
import { createBridgeSection } from "@/db/actions/create-bridge-section";

import { findSessionsForEventId, getSectionsForSession } from "@/db/queries";

import { BridgeSession, BridgeSection } from "@/db/schema";

const EVENT_TYPES = ["Pairs", "Teams"];

export function useDirectorEvents() {
  const events = useDirectorStore((state) => state.bridgeEvents);

  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);

  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, number[]>
  >({});
  const [sessionsMap, setSessionsMap] = useState<
    Record<string, BridgeSession[]>
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
        id: crypto.randomUUID(),
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

  const createSession = async (eventId: string, sessionName: string) => {
    if (!sessionName.trim()) return;

    const session = {
      id: crypto.randomUUID(),
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

  const createSection = async (sessionId: string, sectionName: string) => {
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

      const updated = await getSectionsForSession(sessionId);

      setSectionsMap((prev) => ({
        ...prev,
        [sessionId]: updated,
      }));
    });
  };

  /* TOGGLES */

  const toggleEvent = async (eventId: string) => {
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

  const toggleSession = async (eventId: string, sessionIdx: number) => {
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
