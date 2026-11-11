"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { Spinner } from "@/components/common/Spinner";
import type { PairScorecard } from "@/model/scorecard";
import {
  buildScorecardTable,
  buildScorecardVpTable,
  scorecardViews,
} from "@/scoring/scorecard/scorecard-table";

export interface ScorecardPageProps {
  /** The pair's scorecard, or null when there is none (yet). */
  card: PairScorecard | null;
  /** True until the scorecard has loaded. */
  loading: boolean;
  /**
   * Drop the section prefix from opponents' pair numbers — set when the
   * section adds nothing (one section, or sections ranked separately).
   */
  hideSection: boolean;
  /** Back to play. */
  onBack: () => void;
}

/**
 * The player's personal Scorecard: every board their pair has played so far,
 * with the contract and result, their score on the board, and their
 * matchpoints (with a % / MP toggle), IMPs or Cross-IMPs, plus a total. A
 * Swiss Pairs event adds the Victory Points from each round. Each board is
 * scored as on the Board Results screen, and the page updates live as results
 * come in. The header back arrow returns to play.
 */
export function ScorecardPage({
  card,
  loading,
  hideSection,
  onBack,
}: ScorecardPageProps) {
  const vpTable = card ? buildScorecardVpTable(card, { hideSection }) : null;

  return (
    <GamePageLayout
      headerTitle="Scorecard"
      contentMode="scroll"
      backAction={onBack}
    >
      <div className="flex flex-col gap-6 px-2 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !card || card.boards.length === 0 ? (
          <p className="px-4 py-12 text-center text-base text-gray-600">
            No boards played yet. Your results will appear here as you play.
          </p>
        ) : (
          <PluginViewSwitcher
            views={scorecardViews(card)}
            renderView={(view) => (
              <ScoreTableView
                table={buildScorecardTable(card, view.id, { hideSection })}
                // Highlights the Total row (it carries this pair's id).
                highlightAssignmentId={card.pairId}
                rowTestId="scorecard-row"
                scroll={false}
              />
            )}
          />
        )}

        {vpTable && (
          <section aria-label="Victory points by round">
            <h2 className="mb-2 px-2 text-base font-semibold text-gray-900">
              Victory points
            </h2>
            <ScoreTableView
              table={vpTable}
              highlightAssignmentId={card!.pairId}
              rowTestId="scorecard-vp-row"
              scroll={false}
            />
          </section>
        )}
      </div>
    </GamePageLayout>
  );
}
