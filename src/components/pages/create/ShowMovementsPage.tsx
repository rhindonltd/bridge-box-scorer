"use client";

import { useState, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  IndividualMovementSpec,
  PairMovementSpec,
  TeamMovementSpec,
} from "@/db/movements/schema";
import { MovementCard } from "@/components/pages/create/MovementCard";
import Button from "@/components/common/Button";
import { selectMovement, selectMitchellMovement } from "@/lib/game-service";
import {
  MovementDetailView,
  MovementTableData,
} from "@/components/movement/MovementDetailView";
import { NumberStepperField } from "@/components/common/NumberStepperField";
import {
  MitchellMovementSpec,
  generateMitchell,
} from "@/movement/mitchell";

type Props = {
  onShowTablesPage: () => void;
};

type SelectedMovement = {
  id: number;
  type: string;
  name: string;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();

  const [selected, setSelected] = useState<SelectedMovement | null>(null);
  const [mitchellBoardsPerRound, setMitchellBoardsPerRound] = useState(3);
  const [mitchellSpec, setMitchellSpec] = useState<MitchellMovementSpec | null>(
    null,
  );

  const tables = game?.tables ?? 0;
  const gameType = game?.gameType;

  const shouldLoadIndividual = gameType === "INDIVIDUAL";
  const shouldLoadPairs = gameType === "PAIRS";
  const shouldLoadTeams = gameType === "PAIRS";

  const { data: individualMovements } = useSWR<IndividualMovementSpec[]>(
    shouldLoadIndividual ? `/api/movements/individual/${tables}` : null,
    fetcher,
  );

  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    shouldLoadPairs ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  const { data: teamMovements } = useSWR<TeamMovementSpec[]>(
    shouldLoadTeams ? `/api/movements/teams/${tables}` : null,
    fetcher,
  );

  // Fetch full movement detail when one is selected (DB-based)
  const { data: movementDetail } = useSWR<{
    type: string;
    tables: MovementTableData[];
  }>(
    selected && selected.type !== "MITCHELL"
      ? `/api/movements/detail/${selected.type}/${selected.id}`
      : null,
    fetcher,
  );

  // Mitchell options based on table count
  const mitchellOptions = useMemo(() => {
    if (!tables || tables < 2) return [];

    const options: { name: string; spec: MitchellMovementSpec }[] = [];

    if (tables % 2 === 1) {
      // Odd tables: standard Mitchell
      options.push({
        name: "Standard Mitchell",
        spec: {
          tables,
          rounds: tables,
          boardsPerRound: mitchellBoardsPerRound,
        },
      });
    } else {
      // Even tables: share & relay or skip
      options.push({
        name: "Mitchell Share and Relay",
        spec: {
          tables,
          rounds: tables,
          boardsPerRound: mitchellBoardsPerRound,
        },
      });
      options.push({
        name: "Skip Mitchell",
        spec: {
          tables,
          rounds: tables,
          boardsPerRound: mitchellBoardsPerRound,
          skip: true,
        },
      });
    }

    return options;
  }, [tables, mitchellBoardsPerRound]);

  // Mitchell preview generated client-side
  const mitchellPreview = useMemo(() => {
    if (selected?.type !== "MITCHELL" || !mitchellSpec) return null;
    try {
      const generated = generateMitchell(mitchellSpec);
      return {
        type: "PAIRS",
        tables: generated.tables.map((t) => ({
          tableNumber: t.table,
          rounds: t.rounds.map((r) => ({
            roundNumber: r.round,
            ns: r.participants.nsId,
            ew: r.participants.ewId,
            boardStart: r.boards[0],
            boardEnd: r.boards[r.boards.length - 1],
          })),
        })),
      };
    } catch {
      return null;
    }
  }, [selected, mitchellSpec]);

  if (!game) {
    return null;
  }

  function handleMovementClicked(id: number, type: string, name: string) {
    setSelected({ id, type, name });
    setMitchellSpec(null);
  }

  function handleMitchellSelected(option: {
    name: string;
    spec: MitchellMovementSpec;
  }) {
    setSelected({ id: -1, type: "MITCHELL", name: option.name });
    setMitchellSpec(option.spec);
  }

  function handleSelect() {
    if (!selected) return;
    if (selected.type === "MITCHELL" && mitchellSpec) {
      selectMitchellMovement(game!.gameId, mitchellSpec);
    } else {
      selectMovement(game!.gameId, selected.id, selected.type);
    }
    setSelected(null);
  }

  function handleBack() {
    setSelected(null);
    setMitchellSpec(null);
  }

  // Show detail view when a movement is selected
  if (selected && (movementDetail || mitchellPreview)) {
    const detailData =
      selected.type === "MITCHELL" ? mitchellPreview : movementDetail;
    if (!detailData) return null;
    return (
      <div className="h-full">
        <MovementDetailView
          movementName={selected.name}
          movementType="PAIRS"
          tables={detailData.tables as MovementTableData[]}
          onBack={handleBack}
          onSelect={handleSelect}
        />
      </div>
    );
  }

  // Show loading state while detail is being fetched (DB-based only)
  if (selected && selected.type !== "MITCHELL" && !movementDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Movement list view — grouped by type with section headings
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {shouldLoadPairs && (
          <div>
            <SectionHeading title="Generated Movements" />
            <div className="mb-4">
              <NumberStepperField
                label="Boards per round:"
                value={mitchellBoardsPerRound}
                onChange={setMitchellBoardsPerRound}
                min={2}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {mitchellOptions.map((option) => (
                <MitchellCard
                  key={option.name}
                  name={option.name}
                  spec={option.spec}
                  onSelect={() => handleMitchellSelected(option)}
                />
              ))}
            </div>
          </div>
        )}

        {shouldLoadIndividual && (
          <MovementSection
            title="Individual Movements"
            movements={individualMovements ?? []}
            type="INDIVIDUAL"
            onSelect={handleMovementClicked}
          />
        )}

        {shouldLoadPairs && (
          <MovementSection
            title="Pairs Movements"
            movements={pairMovements ?? []}
            type="PAIRS"
            onSelect={handleMovementClicked}
          />
        )}

        {shouldLoadTeams && (
          <MovementSection
            title="Teams Movements"
            movements={teamMovements ?? []}
            type="TEAMS"
            onSelect={handleMovementClicked}
          />
        )}
      </div>

      <div className="p-4 border-t">
        <Button value="Show Tables" onClick={onShowTablesPage} />
      </div>
    </div>
  );
}

/* ---- Mitchell Card component ---- */

function MitchellCard({
  name,
  spec,
  onSelect,
}: {
  name: string;
  spec: MitchellMovementSpec;
  onSelect: () => void;
}) {
  const effectiveRounds = spec.skip ? spec.tables - 1 : spec.rounds;
  const totalBoards = spec.tables * spec.boardsPerRound;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-left w-full
        hover:border-blue-300 hover:shadow-md
        active:scale-[0.98] active:bg-blue-100
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Rounds</div>
          <div className="font-medium text-gray-900">{effectiveRounds}</div>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Boards/Round</div>
          <div className="font-medium text-gray-900">{spec.boardsPerRound}</div>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Total Boards</div>
          <div className="font-medium text-gray-900">{totalBoards}</div>
        </div>
      </div>
    </button>
  );
}

/* ---- Section component ---- */

type MovementSpec = IndividualMovementSpec | PairMovementSpec | TeamMovementSpec;

function MovementSection({
  title,
  movements,
  type,
  onSelect,
}: {
  title: string;
  movements: MovementSpec[];
  type: string;
  onSelect: (id: number, type: string, name: string) => void;
}) {
  if (movements.length === 0) {
    return (
      <div>
        <SectionHeading title={title} />
        <p className="text-gray-500 text-sm italic px-1">
          No movements available for this table count.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading title={title} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {movements.map((movement) => (
          <MovementCard
            key={`${movement.type}-${movement.id}`}
            movement={movement}
            onSelected={(id) => onSelect(id, type, movement.name)}
          />
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
      {title}
    </h2>
  );
}
