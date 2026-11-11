"use client";

import { useId, useMemo, useState, type ChangeEvent } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { parsePbnFile, type ParsedPbnBoard } from "@/model/pbn-file";

/** A PBN deal file is a few KB; anything this large is not one. */
const MAX_FILE_BYTES = 1_000_000;

interface ImportDealsPageProps {
  /** Board numbers the event plays (from the movement). */
  eventBoards: number[];
  /** True while `eventBoards` is still being fetched. */
  boardsLoading: boolean;
  /** True while the import request is in flight. */
  isImporting: boolean;
  /** Failure from the last import attempt, shown without losing the input. */
  error: string | null;
  /** Number of boards saved by a successful import; shows the done screen. */
  importedCount: number | null;
  onImport: (deals: ParsedPbnBoard[]) => void;
  onBack: () => void;
  onDone: () => void;
}

const formatBoards = (boards: number[]) => boards.join(", ");

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const primaryButton =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

/**
 * Director step: import the hands for many boards from a dealing-machine PBN
 * file. The file (or pasted text) is parsed in the browser and previewed
 * against the event's boards before anything is saved. Only the hands are read;
 * importing replaces any hands already entered for the same boards.
 */
export function ImportDealsPage({
  eventBoards,
  boardsLoading,
  isImporting,
  error,
  importedCount,
  onImport,
  onBack,
  onDone,
}: ImportDealsPageProps) {
  const fileId = useId();
  const textId = useId();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (text.trim() === "") return null;

    const parsed = parsePbnFile(text);
    const inEvent = new Set(eventBoards);
    const found = new Set(parsed.boards.map((b) => b.boardNumber));

    return {
      toImport: parsed.boards.filter((b) => inEvent.has(b.boardNumber)),
      notInEvent: parsed.boards
        .map((b) => b.boardNumber)
        .filter((n) => !inEvent.has(n)),
      missing: eventBoards.filter((n) => !found.has(n)),
      errors: parsed.errors,
    };
  }, [text, eventBoards]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError("That file is too large to be a PBN deal file.");
    } else {
      try {
        setText(await file.text());
        setFileName(file.name);
      } catch {
        setFileError("Could not read that file. Try pasting its text instead.");
      }
    }
    // Allow choosing the same file again.
    input.value = "";
  }

  if (importedCount !== null) {
    return (
      <GamePageLayout
        headerTitle="Import PBN"
        hideBack
        centerContent
        actions={
          <button type="button" onClick={onDone} className={primaryButton}>
            Done
          </button>
        }
      >
        <div role="status" className="px-6 text-center">
          <p className="text-xl font-semibold text-gray-900">
            {plural(importedCount, "board", "boards")} imported
          </p>
          <p className="text-gray-600 mt-2">
            The hands are now available on the travellers.
          </p>
        </div>
      </GamePageLayout>
    );
  }

  const canImport =
    !boardsLoading &&
    !isImporting &&
    preview !== null &&
    preview.toImport.length > 0;

  return (
    <GamePageLayout
      headerTitle="Import PBN"
      backAction={onBack}
      actions={
        <button
          type="button"
          disabled={!canImport}
          onClick={() => preview && onImport(preview.toImport)}
          className={primaryButton}
        >
          {isImporting
            ? "Importing..."
            : preview && preview.toImport.length > 0
              ? `Import ${plural(preview.toImport.length, "board", "boards")}`
              : "Import"}
        </button>
      }
    >
      <div className="px-6 space-y-5">
        <p className="text-sm text-gray-600">
          Choose the PBN file from your dealing machine, or paste its text. Only
          the hands are read.
        </p>

        <div>
          <label
            htmlFor={fileId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            PBN file
          </label>
          <input
            id={fileId}
            type="file"
            accept=".pbn,.txt,text/plain"
            onChange={handleFile}
            disabled={isImporting}
            className="block w-full text-base text-gray-700 file:mr-4 file:rounded-xl file:border-0 file:bg-gray-200 file:px-4 file:py-3 file:text-base file:font-semibold file:text-gray-800 hover:file:bg-gray-300"
          />
          {fileName && (
            <p className="text-sm text-gray-600 mt-1">Loaded {fileName}</p>
          )}
          {fileError && (
            <p className="text-sm text-red-600 mt-1" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={textId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Or paste PBN text
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName(null);
            }}
            disabled={isImporting}
            rows={6}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full p-3 border-2 border-gray-200 rounded-xl font-mono text-sm text-gray-900 focus-visible:outline-none focus-visible:border-blue-500"
          />
        </div>

        <div role="status" aria-live="polite" data-testid="import-preview">
          {preview && (
            <div className="space-y-2 text-sm">
              {boardsLoading ? (
                <p className="text-gray-600">
                  Checking the event&apos;s boards...
                </p>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-900">
                    {plural(preview.toImport.length, "board", "boards")} found
                    {", "}
                    {preview.missing.length} missing
                  </p>
                  {preview.missing.length > 0 && (
                    <p className="text-gray-700">
                      Event boards not in the file:{" "}
                      {formatBoards(preview.missing)}
                    </p>
                  )}
                  {preview.notInEvent.length > 0 && (
                    <p className="text-gray-700">
                      Not in this event, so skipped:{" "}
                      {formatBoards(preview.notInEvent)}
                    </p>
                  )}
                  {preview.errors.length > 0 && (
                    <ul className="text-red-700 list-disc pl-5">
                      {preview.errors.map((e) => (
                        <li key={`${e.gameIndex}-${e.message}`}>
                          {e.boardNumber !== undefined
                            ? `Board ${e.boardNumber}`
                            : `Game ${e.gameIndex}`}
                          : {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {preview.toImport.length > 0 && (
                    <p className="text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
                      Any hands already entered for these boards will be
                      replaced.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </GamePageLayout>
  );
}
