"use client";

import { useState } from "react";

import {
  ContractCode,
  ContractSuit,
  Doubling,
  Level,
  buildContractCode,
} from "@/model/contract";
import { Card, Direction, Rank, Suit } from "@/model/common";
import { PlayedContractCode, SpecialBoardOutcome } from "@/model/result";

import { StepLevel } from "@/components/contract-wizard/StepLevel";
import { StepSuit } from "@/components/contract-wizard/StepSuit";
import { StepDeclarer } from "@/components/contract-wizard/StepDeclarer";
import { StepOpeningLead } from "@/components/contract-wizard/StepOpeningLead";
import { StepResult } from "@/components/contract-wizard/StepResult";
import { StepConfirm } from "@/components/contract-wizard/StepConfirm";
import { StepAdjustedScore } from "@/components/contract-wizard/StepAdjustedScore";
import { StepWeightedScore } from "@/components/contract-wizard/StepWeightedScore";
import { StepAdjustmentType } from "@/components/contract-wizard/StepAdjustmentType";
import { StepTeamsRemoval } from "@/components/contract-wizard/StepTeamsRemoval";
import { StepVoidMatch } from "@/components/contract-wizard/StepVoidMatch";
import { StepPairsVoid } from "@/components/contract-wizard/StepPairsVoid";
import { StepMismatch } from "@/components/contract-wizard/StepMismatch";
import { WizardShell } from "@/components/contract-wizard/WizardShell";
import { TeamsRemovalFault } from "@/model/teams-removed-board";
import { VoidCause } from "@/model/teams-match-void";
import { PairsVoidCause } from "@/model/pairs-match-void";
import {
  MismatchSide,
  MismatchDirection,
  MismatchFault,
} from "@/model/swiss-mismatch";

export type DirectorWizardResult =
  | {
      type: "contract";
      contract: ContractCode | SpecialBoardOutcome;
      result: number;
      lead: Card | null;
    }
  | {
      type: "adjusted";
      nsPercent: number;
      ewPercent: number;
    }
  | {
      type: "weighted";
      components: { contract: PlayedContractCode; weight: number }[];
    }
  | {
      type: "cancel";
      nsPercent: number;
      ewPercent: number;
    }
  | {
      type: "removeTeams";
      fault: TeamsRemovalFault;
    }
  | {
      type: "voidMatch";
      cause: VoidCause;
    }
  | {
      type: "voidPairs";
      cause: PairsVoidCause;
    }
  | {
      type: "mismatch";
      side: MismatchSide;
      direction: MismatchDirection;
      fault: MismatchFault;
    };

interface DirectorContractWizardProps {
  boardNumber: number;
  round: number;
  table: number;
  leadCardRequired: boolean;
  /**
   * Whether to offer the §3.3.7 "Board Not Played (Teams)" and §3.3.6/§3.3.9
   * "Void Match (Teams)" branches on the hub. True for every teams game.
   */
  allowTeamsRulings?: boolean;
  /**
   * Whether this is a board-comparison teams game (BAM/PAB), so the teams
   * ruling steps phrase the indemnity in board-win terms rather than IMPs/VP.
   */
  boardComparison?: boolean;
  /**
   * Whether to offer the §3.3.8/§3.3.9 "Void Match (Pairs)" branch. True only
   * for Swiss Pairs games.
   */
  allowPairsVoid?: boolean;
  /**
   * Whether to offer the §3.5 "Mismatch (Swiss)" branch. True for any Swiss
   * game (pairs or teams), where a wrong draw can create a mismatch.
   */
  allowMismatch?: boolean;
  /**
   * Whether this is a teams game, so the mismatch step labels the sides as
   * teams rather than pairs.
   */
  teamsMismatch?: boolean;
  onComplete: (data: DirectorWizardResult) => void;
  onBack: () => void;
}

/**
 * A variant of ContractWizard for director use.
 * Skips the board selection step (board is pre-selected from the traveller).
 * Does not require AssignmentContext. Shares the {@link WizardShell} chrome and
 * the {@link buildContractCode} assembly with the player wizard; the state
 * machine differs (starts at an adjustment-type hub, and has adjusted-score,
 * weighted-score and cancel/foul branches) so it is kept inline here rather
 * than forced onto the player's `useBoardFlow`.
 *
 * Flow: tapping a traveller row lands on the hub (step 0), which routes to one
 * of four sub-flows — Enter Contract (the Level→…→Confirm steps), Adjusted
 * Score, Weighted Score, or Cancel/Foul Board (the §3.3.2 reason picker). The
 * contract path keeps its Confirm review; the other three commit on their own
 * action. Back from any sub-flow returns to the hub; back from the hub calls
 * `onBack`.
 */
export function DirectorContractWizard({
  boardNumber,
  round,
  table,
  leadCardRequired,
  allowTeamsRulings = false,
  boardComparison = false,
  allowPairsVoid = false,
  allowMismatch = false,
  teamsMismatch = false,
  onComplete,
  onBack,
}: DirectorContractWizardProps) {
  // Steps: 0=Hub (choose adjustment type), 1=Level, 2=Suit, 3=Declarer,
  //        4=OpeningLead, 5=Result, 6=Confirm, 7=AdjustedScore,
  //        8=WeightedScore, 9=Cancel (adjusted-score screen),
  //        10=TeamsRemoval, 11=VoidMatch(Teams), 12=VoidMatch(Pairs),
  //        13=Mismatch(Swiss)
  const [step, setStep] = useState(0);

  // Contract state
  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [dbl, setDbl] = useState<Doubling>("");
  const [specialOutcome, setSpecialOutcome] =
    useState<SpecialBoardOutcome | null>(null);

  // Lead state
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [leadRank, setLeadRank] = useState<Rank | null>(null);

  // Result state
  const [resultMode, setResultMode] = useState<"made" | "down">("made");
  const [resultValue, setResultValue] = useState(0);

  // --- Step transition handlers ---

  const onLevelSelected = (selectedLevel: Level) => {
    setLevel(selectedLevel);
    setSpecialOutcome(null);
    setStep(2);
  };

  const onSpecialOutcome = (outcome: SpecialBoardOutcome) => {
    setSpecialOutcome(outcome);
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
    setStep(6);
  };

  const onSuitSelected = (selectedSuit: ContractSuit) => {
    setSuit(selectedSuit);
    setStep(3);
  };

  const onDeclarerSelected = (
    selectedDeclarer: Direction,
    selectedDbl: Doubling,
  ) => {
    setDeclarer(selectedDeclarer);
    setDbl(selectedDbl);
    setStep(leadCardRequired ? 4 : 5);
  };

  const onLeadComplete = (selectedSuit: Suit, selectedRank: Rank) => {
    setLeadSuit(selectedSuit);
    setLeadRank(selectedRank);
    setStep(5);
  };

  const onResultComplete = (mode: "made" | "down", value: number) => {
    setResultMode(mode);
    setResultValue(value);
    setStep(6);
  };

  const onSubmit = () => {
    if (specialOutcome) {
      onComplete({
        type: "contract",
        contract: specialOutcome,
        result: 0,
        lead: null,
      });
      return;
    }

    // The confirm step (6) is only reachable after level, suit and declarer
    // have all been chosen (or via a special outcome, handled above), so the
    // "incomplete contract" else path here is defensive and unreachable.
    /* v8 ignore next -- unreachable: confirm requires a complete contract */
    if (level && suit && declarer !== null) {
      const contract = buildContractCode(level, suit, dbl, declarer);
      const lead: Card | null =
        leadSuit && leadRank ? (`${leadSuit}${leadRank}` as Card) : null;

      const numericResult = resultMode === "down" ? -resultValue : resultValue;
      onComplete({ type: "contract", contract, result: numericResult, lead });
    }
  };

  const onAdjustedScoreSubmit = (nsPercent: number, ewPercent: number) => {
    onComplete({ type: "adjusted", nsPercent, ewPercent });
  };

  const onWeightedScoreSubmit = (
    components: { contract: PlayedContractCode; weight: number }[],
  ) => {
    onComplete({ type: "weighted", components });
  };

  const onCancelSubmit = (nsPercent: number, ewPercent: number) => {
    onComplete({ type: "cancel", nsPercent, ewPercent });
  };

  const onTeamsRemovalSubmit = (fault: TeamsRemovalFault) => {
    onComplete({ type: "removeTeams", fault });
  };

  const onVoidMatchSubmit = (cause: VoidCause) => {
    onComplete({ type: "voidMatch", cause });
  };

  const onVoidPairsSubmit = (cause: PairsVoidCause) => {
    onComplete({ type: "voidPairs", cause });
  };

  const onMismatchSubmit = (ruling: {
    side: MismatchSide;
    direction: MismatchDirection;
    fault: MismatchFault;
  }) => {
    onComplete({ type: "mismatch", ...ruling });
  };

  // --- Hub routing: entering any contract branch clears any stale state so a
  // re-entry (back to hub, pick a different branch) starts fresh. ---

  const onEnterContract = () => {
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
    setSpecialOutcome(null);
    setLeadSuit(null);
    setLeadRank(null);
    setResultMode("made");
    setResultValue(0);
    setStep(1);
  };

  // --- Back arrow logic ---

  const handleBack = () => {
    switch (step) {
      case 0:
        onBack();
        break;
      case 1:
        setStep(0);
        break;
      case 2:
        setStep(1);
        break;
      case 3:
        setStep(2);
        break;
      case 4:
        setStep(3);
        break;
      case 5:
        setStep(leadCardRequired ? 4 : 3);
        break;
      case 6:
        setStep(specialOutcome ? 1 : 5);
        break;
      // Adjusted / Weighted / Cancel / Teams-removal / Void(s) / Mismatch are
      // hub branches.
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
        setStep(0);
        break;
    }
  };

  // Title shown in the header for the current step. Level/suit/declarer all
  // build the contract, so they share one title.
  const stepTitle = (() => {
    switch (step) {
      case 0:
        return "Adjust Result";
      case 4:
        return "Opening Lead";
      case 5:
        return "Enter Result";
      case 6:
        return "Confirm";
      case 7:
        return "Adjusted Score";
      case 8:
        return "Weighted Score";
      case 9:
        return "Cancel / Foul Board";
      case 10:
        return "Board Not Played (Teams)";
      case 11:
        return "Void Match (Teams)";
      case 12:
        return "Void Match (Pairs)";
      case 13:
        return "Mismatch (Swiss)";
      default:
        return "Enter Contract";
    }
  })();

  // --- Step rendering ---

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepAdjustmentType
            onEnterContract={onEnterContract}
            onAdjustedScore={() => setStep(7)}
            onWeightedScore={() => setStep(8)}
            onCancelBoard={() => setStep(9)}
            onRemoveTeamsBoard={
              allowTeamsRulings ? () => setStep(10) : undefined
            }
            onVoidTeamsMatch={
              allowTeamsRulings ? () => setStep(11) : undefined
            }
            onVoidPairsMatch={
              allowPairsVoid ? () => setStep(12) : undefined
            }
            onMismatch={allowMismatch ? () => setStep(13) : undefined}
          />
        );
      case 1:
        return (
          <StepLevel
            onLevelSelected={onLevelSelected}
            onSpecialOutcome={onSpecialOutcome}
          />
        );
      case 2:
        return <StepSuit level={level!} onSuitSelected={onSuitSelected} />;
      case 3:
        return (
          <StepDeclarer
            level={level!}
            suit={suit!}
            onDeclarerSelected={onDeclarerSelected}
          />
        );
      case 4:
        return (
          <StepOpeningLead
            onLeadComplete={onLeadComplete}
            initialSuit={leadSuit}
            initialRank={leadRank}
            onSuitChange={setLeadSuit}
            onRankChange={setLeadRank}
          />
        );
      case 5:
        return (
          <StepResult level={level!} onResultComplete={onResultComplete} />
        );
      case 6:
        return (
          <StepConfirm
            level={level}
            suit={suit}
            declarer={declarer}
            dbl={dbl}
            specialOutcome={specialOutcome}
            leadSuit={leadSuit}
            leadRank={leadRank}
            resultMode={resultMode}
            resultValue={resultValue}
            onSubmit={onSubmit}
          />
        );
      case 7:
        return <StepAdjustedScore onSubmit={onAdjustedScoreSubmit} />;
      case 8:
        return <StepWeightedScore onSubmit={onWeightedScoreSubmit} />;
      case 9:
        return <StepAdjustedScore onSubmit={onCancelSubmit} />;
      case 10:
        return (
          <StepTeamsRemoval
            onSubmit={onTeamsRemovalSubmit}
            boardComparison={boardComparison}
          />
        );
      case 11:
        return (
          <StepVoidMatch
            onSubmit={onVoidMatchSubmit}
            boardComparison={boardComparison}
          />
        );
      case 12:
        return <StepPairsVoid onSubmit={onVoidPairsSubmit} />;
      case 13:
        return (
          <StepMismatch teams={teamsMismatch} onSubmit={onMismatchSubmit} />
        );
      /* v8 ignore next 2 -- unreachable: `step` is only ever set to 0..13 */
      default:
        return null;
    }
  };

  return (
    <WizardShell
      title={stepTitle}
      round={round}
      table={table}
      headerRight={
        <span className="text-base font-semibold text-gray-600">Director</span>
      }
      showBack
      onBack={handleBack}
      subHeaderRight={
        <span className="px-4 py-2 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm">
          Board {boardNumber}
        </span>
      }
    >
      {renderStep()}
    </WizardShell>
  );
}
