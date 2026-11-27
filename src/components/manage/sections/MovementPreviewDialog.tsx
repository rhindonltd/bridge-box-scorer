"use client";

import { Fragment, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import {
  americanWhistPreview,
  MovementByTable,
  RecommendedMovementSpecRef,
  TeamsMovementRef,
  generatedToMovementByTable,
  generateMitchell,
} from "@/modules/movement-catalog";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import { Spinner } from "@/components/common/Spinner";

/**
 * A movement the dialog can preview: a pairs recommendation (a generated
 * Mitchell or a pairs library spec) or a teams option (an American Whist or a
 * teams library movement).
 */
export interface PreviewableMovement {
  name: string;
  specRef: RecommendedMovementSpecRef | TeamsMovementRef;
}

/** The detail endpoint for a stored movement, or null for a generated one. */
function detailKey(specRef: PreviewableMovement["specRef"]): string | null {
  if (specRef.source === "db") return swrKeys.movementDetail(specRef.id);
  if (specRef.source === "library") {
    return swrKeys.teamsMovementDetail(specRef.id);
  }
  return null;
}

/**
 * Popup showing the full table/round breakdown for the previewed movement, with
 * a Close action (dismiss) and a "Select Movement" action (persist and close).
 * Open when `movement` is non-null. The details content — including its data
 * fetch — is mounted only while open, so no request runs for a closed dialog.
 */
export function MovementPreviewDialog<M extends PreviewableMovement>({
  movement,
  saving,
  onClose,
  onConfirm,
}: {
  movement: M | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (movement: M) => void;
}) {
  return (
    <Transition show={movement != null} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {movement && (
                <MovementPreviewContent
                  movement={movement}
                  saving={saving}
                  onClose={onClose}
                  onConfirm={() => onConfirm(movement)}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Contents of the movement-preview popup. Generated movements (Mitchell,
 * American Whist) are previewed client-side; stored (pairs or teams library)
 * movements are fetched from their detail API. Mounted only
 * while the dialog is open so its fetch is scoped to an open popup.
 */
function MovementPreviewContent({
  movement,
  saving,
  onClose,
  onConfirm,
}: {
  movement: PreviewableMovement;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // DB-based movements need their full layout fetched. Generated Mitchells are
  // computed locally from the spec, so no request is made for them. The shared
  // fetcher already unwraps the `{ result }` success envelope, so `detail` is
  // the inner `{ name, tables }` payload.
  const { data: detail } = useSWR<{ tables: MovementByTable[] }>(
    detailKey(movement.specRef),
    fetcher,
  );

  const previewTables = useMemo<MovementByTable[] | null>(() => {
    if (movement.specRef.source === "generated") {
      try {
        return generatedToMovementByTable(
          generateMitchell(movement.specRef.spec),
        );
      } catch {
        return null;
      }
    }
    if (movement.specRef.source === "americanWhist") {
      return americanWhistPreview(movement.specRef.spec);
    }
    return detail?.tables ?? null;
  }, [movement, detail]);

  return (
    <>
      <div className="shrink-0 border-b border-gray-200">
        <Dialog.Title className="text-md font-bold text-gray-800 bg-gray-300 p-4">
          {movement.name}
        </Dialog.Title>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {previewTables ? (
          <MovementDetailView tables={previewTables} />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t p-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-xl bg-gray-100 py-3 text-md font-bold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || !previewTables}
          className="flex-1 rounded-xl bg-green-700 py-3 text-md font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Selecting…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
