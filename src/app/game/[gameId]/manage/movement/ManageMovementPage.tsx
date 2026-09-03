"use client";

import { useRequiredGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import { PageLayout } from "@/components/layout/PageLayout";
import { MovementByTable } from "@/movement/movementData";
import { useSections } from "@/hooks/sections";

interface ManageMovementPageProps {
  backHref: string;
}

export function ManageMovementPage({ backHref }: ManageMovementPageProps) {
  interface MovementResponse {
    type: string;
    tables: MovementByTable[];
  }

  const { game } = useRequiredGame();

  const { sections } = useSections(game.gameId);
  const multiSection = sections.length > 1;

  // Which section's movement is shown. Defaults to the first section (A) once
  // the section list loads. A single-section game never surfaces a selector.
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const activeSection = selectedSection ?? sections[0]?.section ?? null;

  const movementFetcher = async (url: string): Promise<MovementResponse> => {
    const response: { movement: MovementResponse } = await fetcher(url);

    return response.movement;
  };

  // Table numbers restart within each section, so the movement must be fetched
  // one section at a time. Hold off fetching until we know which section.
  const { data, isLoading, mutate } = useSWR<MovementResponse>(
    activeSection
      ? `/api/games/${game.gameId}/movement?section=${activeSection}`
      : null,
    movementFetcher,
  );

  useEffect(() => {
    const socket = getSocket();
    const onBoardResultUpdated = () => {
      mutate();
    };
    socket.on(SocketEvents.BOARD_RESULT_UPDATED, onBoardResultUpdated);
    return () => {
      socket.off(SocketEvents.BOARD_RESULT_UPDATED, onBoardResultUpdated);
    };
  }, [mutate]);

  const selector = multiSection ? (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-gray-50 border-b shrink-0">
      {sections.map((s) => (
        <SectionTab
          key={s.section}
          label={`Section ${s.section}`}
          active={activeSection === s.section}
          onClick={() => setSelectedSection(s.section)}
        />
      ))}
    </div>
  ) : null;

  if (isLoading || !data) {
    return (
      <PageLayout headerTitle="Movement Details" backHref={backHref}>
        {selector}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  if (data.tables.length === 0) {
    return (
      <PageLayout headerTitle="Movement Details" backHref={backHref}>
        {selector}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-base">No movement set up yet.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout headerTitle="Movement Details" backHref={backHref}>
      {selector}
      <MovementDetailView tables={data.tables} />
    </PageLayout>
  );
}

function SectionTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
