"use client";

import { useRequiredGame } from "@/context/GameContext";
import { Spinner } from "@/components/common/Spinner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import { PageLayout } from "@/components/layout/PageLayout";
import { MovementByTable } from "@/movement/movementData";
import { useSections } from "@/hooks/sections";
import { SectionPills } from "@/components/manage/sections/SectionPills";
import { useResultsComplete } from "@/hooks/results-complete";
import { SwissDrawControl } from "./SwissDrawControl";
import { SwissTeamsDrawControl } from "./SwissTeamsDrawControl";

interface ManageMovementPageProps {
  /** Where back goes when there is no in-app history to pop (e.g. a direct link). */
  backFallbackHref: string;
}

export function ManageMovementPage({
  backFallbackHref,
}: ManageMovementPageProps) {
  interface MovementResponse {
    type: string;
    tables: MovementByTable[];
  }

  const { game } = useRequiredGame();

  const { sections } = useSections(game.gameId);
  const multiSection = sections.length > 1;
  const { allResultsIn } = useResultsComplete(game.gameId);

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

  // The active section's movement, used to show the right "Draw Next Round"
  // control for a Swiss section (Pairs or Teams).
  const activeSelected = sections.find(
    (s) => s.section === activeSection,
  )?.selectedMovement;
  const swissControl =
    activeSection && activeSelected?.source === "SWISS" ? (
      <SwissDrawControl
        gameId={game.gameId}
        section={activeSection}
        allResultsIn={allResultsIn}
      />
    ) : activeSection && activeSelected?.source === "SWISS_TEAMS" ? (
      <SwissTeamsDrawControl
        gameId={game.gameId}
        section={activeSection}
        allResultsIn={allResultsIn}
      />
    ) : null;

  const selector = multiSection ? (
    // Shared section pills in a pinned grey bar, matching the setup screens.
    // No add-section affordance: sections can't be added from here.
    <div className="flex shrink-0 justify-center border-b border-gray-200 bg-gray-50 px-4 py-3">
      <SectionPills
        sections={sections}
        /* v8 ignore next -- unreachable: the selector renders only with 2+ sections, so activeSection (defaulting to sections[0]) is never null */
        selected={activeSection ?? ""}
        onSelect={setSelectedSection}
      />
    </div>
  ) : null;

  if (isLoading || !data) {
    return (
      <PageLayout
        headerTitle="Movement Details"
        backFallbackHref={backFallbackHref}
      >
        {selector}
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (data.tables.length === 0) {
    return (
      <PageLayout
        headerTitle="Movement Details"
        backFallbackHref={backFallbackHref}
      >
        {selector}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-base">No movement set up yet.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      headerTitle="Movement Details"
      backFallbackHref={backFallbackHref}
    >
      {selector}
      {swissControl}
      <MovementDetailView tables={data.tables} />
    </PageLayout>
  );
}
