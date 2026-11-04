"use client";

import { ReactNode } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface ExportMenuPageProps {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  /** Leave the submenu, returning to the main manage menu. */
  onBack: () => void;
  onDownloadUsebioClick: () => void;
  onDownloadPbnClick: () => void;
  onUploadBridgewebsClick: () => void;
  onUploadEbuClick: () => void;
  /** Show "Download USEBIO" — only once the game has started. */
  showDownloadUsebio: boolean;
  /**
   * Render "Download USEBIO" as disabled. Used while the completion signal is
   * still loading, so the button reserves its space but cannot be clicked until
   * all results are in.
   */
  downloadUsebioDisabled: boolean;
  /**
   * Show "Download PBN" — only once the game has started. PBN exports the
   * entered deals (not results), so it is not gated on results being complete.
   */
  showDownloadPbn: boolean;
  /**
   * Show "Upload to BridgeWebs" — only once the game has started AND BridgeWebs
   * is configured in Settings. Hidden entirely when unconfigured.
   */
  showUploadBridgewebs: boolean;
  /**
   * Render "Upload to BridgeWebs" as disabled — used until every result is in
   * (results are what get uploaded) and while the completion signal loads.
   */
  uploadBridgewebsDisabled: boolean;
  /**
   * Show "Submit to EBU" — only once the game has started AND EBU is configured
   * in Settings. Hidden entirely when unconfigured.
   */
  showUploadEbu: boolean;
  /**
   * Render "Submit to EBU" as disabled — used until every result is in (results
   * are what get submitted) and while the completion signal loads.
   */
  uploadEbuDisabled: boolean;
}

/**
 * The "Export & Publish" submenu of the manage game menu, grouping the related
 * results-export and publishing actions (Download USEBIO, Download PBN, Upload
 * to BridgeWebs, Submit to EBU) off the main menu so it stays uncluttered.
 *
 * Visibility and disabled state mirror what the main menu used to apply to
 * these buttons, so the gating is unchanged — they are just one level deeper.
 */
export function ExportMenuPage({
  headerRight,
  onBack,
  onDownloadUsebioClick,
  onDownloadPbnClick,
  onUploadBridgewebsClick,
  onUploadEbuClick,
  showDownloadUsebio,
  downloadUsebioDisabled,
  showDownloadPbn,
  showUploadBridgewebs,
  uploadBridgewebsDisabled,
  showUploadEbu,
  uploadEbuDisabled,
}: ExportMenuPageProps) {
  const standardButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed pl-4";

  return (
    <GamePageLayout
      headerTitle="Export & Publish"
      centerContent={true}
      backAction={onBack}
      headerRight={headerRight}
    >
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        {showDownloadUsebio && (
          <button
            onClick={onDownloadUsebioClick}
            disabled={downloadUsebioDisabled}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">Download USEBIO</span>
          </button>
        )}

        {showDownloadPbn && (
          <button onClick={onDownloadPbnClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Download PBN</span>
          </button>
        )}

        {showUploadBridgewebs && (
          <button
            onClick={onUploadBridgewebsClick}
            disabled={uploadBridgewebsDisabled}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">Upload to BridgeWebs</span>
          </button>
        )}

        {showUploadEbu && (
          <button
            onClick={onUploadEbuClick}
            disabled={uploadEbuDisabled}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">Submit to EBU</span>
          </button>
        )}
      </div>
    </GamePageLayout>
  );
}
