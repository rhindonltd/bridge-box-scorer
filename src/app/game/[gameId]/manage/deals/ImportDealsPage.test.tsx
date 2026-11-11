import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportDealsPage } from "./ImportDealsPage";
import type { ParsedPbnBoard } from "@/model/pbn-file";

// GamePageLayout is stubbed so the header's back action and the fixed action
// bar can be exercised without the router/game providers.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {backAction && <button onClick={backAction}>back-action</button>}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

/** A legal deal; the parser does not care which board number it is for. */
const DEAL =
  "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85";

const game = (board: number) => `[Board "${board}"]\n[Deal "${DEAL}"]\n`;
const pbn = (...boards: number[]) => boards.map(game).join("\n");

function setup(
  overrides: Partial<
    Omit<
      Parameters<typeof ImportDealsPage>[0],
      "onImport" | "onBack" | "onDone"
    >
  > = {},
) {
  const onImport = vi.fn<(deals: ParsedPbnBoard[]) => void>();
  const onBack = vi.fn();
  const onDone = vi.fn();
  render(
    <ImportDealsPage
      eventBoards={[1, 2, 3]}
      boardsLoading={false}
      isImporting={false}
      error={null}
      importedCount={null}
      {...overrides}
      onImport={onImport}
      onBack={onBack}
      onDone={onDone}
    />,
  );
  return { onImport, onBack, onDone };
}

const paste = (text: string) =>
  fireEvent.change(screen.getByLabelText("Or paste PBN text"), {
    target: { value: text },
  });

const importButton = () =>
  screen.getByRole("button", { name: /^(Import|Importing)/ });

/** A File whose text() is stubbed, since jsdom's Blob may not implement it. */
function pbnFile(content: string, name = "deals.pbn", size?: number) {
  const file = new File([content], name, { type: "text/plain" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  if (size !== undefined) Object.defineProperty(file, "size", { value: size });
  return file;
}

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText("PBN file"), {
    target: { files: [file] },
  });

describe("ImportDealsPage", () => {
  it("starts with no preview and a disabled import button", () => {
    setup();
    expect(screen.getByTestId("import-preview")).toBeEmptyDOMElement();
    expect(importButton()).toBeDisabled();
    expect(importButton()).toHaveTextContent("Import");
  });

  it("previews pasted boards and imports them", () => {
    const props = setup();
    paste(pbn(1, 2, 3));

    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      "3 boards found, 0 missing",
    );
    expect(
      screen.getByText(/already entered .* will be replaced/),
    ).toBeVisible();
    expect(importButton()).toBeEnabled();
    expect(importButton()).toHaveTextContent("Import 3 boards");

    fireEvent.click(importButton());
    expect(props.onImport).toHaveBeenCalledTimes(1);
    const sent = props.onImport.mock.calls[0][0];
    expect(sent.map((b: { boardNumber: number }) => b.boardNumber)).toEqual([
      1, 2, 3,
    ]);
  });

  it("uses the singular for one board", () => {
    setup({ eventBoards: [1] });
    paste(pbn(1));
    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      "1 board found, 0 missing",
    );
    expect(importButton()).toHaveTextContent("Import 1 board");
  });

  it("lists event boards missing from the file", () => {
    setup({ eventBoards: [1, 2, 3, 4] });
    paste(pbn(1, 2));
    const preview = screen.getByTestId("import-preview");
    expect(preview).toHaveTextContent("2 boards found, 2 missing");
    expect(preview).toHaveTextContent("Event boards not in the file: 3, 4");
  });

  it("skips boards that are not in the event and does not send them", () => {
    const props = setup({ eventBoards: [1, 2] });
    paste(pbn(1, 2, 7, 8));

    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      "Not in this event, so skipped: 7, 8",
    );
    fireEvent.click(importButton());
    const sent = props.onImport.mock.calls[0][0];
    expect(sent.map((b: { boardNumber: number }) => b.boardNumber)).toEqual([
      1, 2,
    ]);
  });

  it("shows per-board errors and still imports the valid boards", () => {
    const props = setup();
    paste(`${game(1)}\n[Board "2"]\n[Deal "N:.63.AKQ987.A9732 - - -"]\n`);

    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      /Board 2: Deal is incomplete/,
    );
    fireEvent.click(importButton());
    expect(props.onImport.mock.calls[0][0]).toHaveLength(1);
  });

  it("keeps import disabled when nothing in the file is usable", () => {
    setup({ eventBoards: [1, 2] });
    paste(pbn(9));
    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      "0 boards found, 2 missing",
    );
    expect(importButton()).toBeDisabled();
    expect(screen.queryByText(/will be replaced/)).not.toBeInTheDocument();
  });

  it("reads a chosen file into the preview", async () => {
    setup();
    chooseFile(pbnFile(pbn(1, 2), "club-night.pbn"));

    expect(await screen.findByText("Loaded club-night.pbn")).toBeVisible();
    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      "2 boards found, 1 missing",
    );
  });

  it("forgets the file name once the text is edited by hand", async () => {
    setup();
    chooseFile(pbnFile(pbn(1), "a.pbn"));
    await screen.findByText("Loaded a.pbn");

    paste(pbn(1, 2));
    expect(screen.queryByText("Loaded a.pbn")).not.toBeInTheDocument();
  });

  it("rejects a file that is too large", () => {
    setup();
    chooseFile(pbnFile("x", "huge.pbn", 5_000_000));
    expect(screen.getByRole("alert")).toHaveTextContent(/too large/);
    expect(screen.getByTestId("import-preview")).toBeEmptyDOMElement();
  });

  it("reports a file that cannot be read", async () => {
    setup();
    const file = pbnFile("x");
    Object.defineProperty(file, "text", {
      value: () => Promise.reject(new Error("nope")),
    });
    chooseFile(file);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Could not read that file/,
    );
  });

  it("does nothing when the file chooser is cancelled", () => {
    setup();
    fireEvent.change(screen.getByLabelText("PBN file"), {
      target: { files: [] },
    });
    expect(screen.getByTestId("import-preview")).toBeEmptyDOMElement();
  });

  it("waits for the event's boards before allowing an import", () => {
    setup({ boardsLoading: true, eventBoards: [] });
    paste(pbn(1));
    expect(screen.getByTestId("import-preview")).toHaveTextContent(
      /Checking the event/,
    );
    expect(importButton()).toBeDisabled();
  });

  it("disables the form while importing", () => {
    setup({ isImporting: true });
    paste(pbn(1));
    expect(importButton()).toBeDisabled();
    expect(importButton()).toHaveTextContent("Importing...");
    expect(screen.getByLabelText("Or paste PBN text")).toBeDisabled();
    expect(screen.getByLabelText("PBN file")).toBeDisabled();
  });

  it("shows an import error without losing the pasted text", () => {
    setup({ error: "Board 2 is not a complete deal" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Board 2 is not a complete deal",
    );
  });

  it("goes back from the header", () => {
    const props = setup();
    fireEvent.click(screen.getByText("back-action"));
    expect(props.onBack).toHaveBeenCalled();
  });

  it("shows the done screen with the saved count", async () => {
    const props = setup({ importedCount: 32 });
    expect(screen.getByRole("status")).toHaveTextContent("32 boards imported");
    expect(screen.queryByText("back-action")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(props.onDone).toHaveBeenCalled());
  });

  it("uses the singular on the done screen", () => {
    setup({ importedCount: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("1 board imported");
  });
});
