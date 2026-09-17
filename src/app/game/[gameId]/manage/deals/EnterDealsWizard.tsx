"use client";

import { useState } from "react";
import useSWR from "swr";
import { Spinner } from "@/components/common/Spinner";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useRequiredGame } from "@/context/GameContext";
import { getDirectorToken } from "@/lib/director-token";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { SelectBoardPage } from "@/app/game/[gameId]/manage/travellers/SelectBoardPage";
import { DealEntry } from "@/components/deal/DealEntry";
import {
  TravellerProvider,
  useTravellerContext,
} from "@/context/TravellerContext";
import { Deal } from "@/model/common";

interface EnterDealsWizardProps {
  onDealSaved: () => void;
}

/**
 * The deal-entry step for one board, wrapped so the existing deal (if any) is
 * read live from the traveller context and used to pre-populate the grid — the
 * director is editing/overwriting, so we start from what's already there.
 */
function EnterDealForBoard({
  boardNumber,
  onSave,
  onBack,
}: {
  boardNumber: number;
  onSave: (deal: Deal) => void;
  onBack: () => void;
}) {
  const { deal, isLoading } = useTravellerContext();

  if (isLoading) {
    return (
      <GamePageLayout headerTitle={`Board ${boardNumber}`} backAction={onBack}>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </GamePageLayout>
    );
  }

  return (
    <GamePageLayout headerTitle={`Board ${boardNumber}`} backAction={onBack}>
      <DealEntry
        boardNumber={boardNumber}
        initialDeal={deal}
        onSubmit={onSave}
        submitLabel="Save deal"
      />
    </GamePageLayout>
  );
}

/**
 * Director flow for entering or correcting the dealt cards for a board:
 * pick a board, then lay out the four hands and save. Mirrors the result
 * correction wizard (select board → act → save). The director may overwrite an
 * existing deal, so the grid is pre-filled with the current deal when there is
 * one.
 *
 * This is the manual-entry surface. A future dealing-machine file import would
 * add a sibling step here (parse a PBN/.dlm file into deals and save each board
 * through the same `deal:override` path) without changing storage.
 */
export function EnterDealsWizard({ onDealSaved }: EnterDealsWizardProps) {
  type Step =
    | { step: "selectBoard" }
    | { step: "enterDeal"; boardNumber: number }
    | { step: "saving" };

  const { game } = useRequiredGame();
  const [step, setStep] = useState<Step>({ step: "selectBoard" });
  const [error, setError] = useState<string | null>(null);

  const { data: boardsData, isLoading: boardsLoading } = useSWR<{
    boards: number[];
  }>(
    step.step === "selectBoard" ? swrKeys.boards(game.gameId) : null,
    fetcher,
  );
  const boards = boardsData?.boards ?? [];

  async function saveDeal(boardNumber: number, deal: Deal) {
    setStep({ step: "saving" });
    setError(null);
    try {
      await emitWithAck(SocketEvents.DEAL_OVERRIDE, {
        gameId: game.gameId,
        directorToken: getDirectorToken(game.gameId),
        boardNumber,
        deal,
      });
      onDealSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the deal");
      setStep({ step: "selectBoard" });
    }
  }

  switch (step.step) {
    case "selectBoard":
      return (
        <>
          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 text-center text-sm">
              {error}
            </div>
          )}
          <SelectBoardPage
            boards={boards}
            isLoading={boardsLoading}
            onBoardSelected={(boardNumber) =>
              setStep({ step: "enterDeal", boardNumber })
            }
          />
        </>
      );

    case "enterDeal":
      return (
        <TravellerProvider boardNumber={step.boardNumber}>
          <EnterDealForBoard
            boardNumber={step.boardNumber}
            onSave={(deal) => saveDeal(step.boardNumber, deal)}
            onBack={() => setStep({ step: "selectBoard" })}
          />
        </TravellerProvider>
      );

    case "saving":
      return (
        <div className="min-h-dvh flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <span className="text-gray-600">Saving deal...</span>
          </div>
        </div>
      );
  }
}
