# Design: Multi-Step Contract Entry

## Overview

A wizard-style flow replaces the single-screen contract entry. Each step is a full-screen page using `PageLayout`. State is managed by a parent component that tracks the current step and accumulated selections.

## Architecture

### Component Structure

```
ContractWizard (state machine)
├── StepLevel (step 1)
├── StepSuit (step 2)
├── StepDeclarer (step 3)
├── StepOpeningLead (step 4, optional)
├── StepResult (step 5)
└── StepConfirm (step 6)
```

### State Machine

The parent `ContractWizard` component manages:
- `step`: current step (1-6)
- `level`: Level | null
- `suit`: ContractSuit | null
- `declarer`: Direction | null
- `dbl`: Doubling ("")
- `specialOutcome`: "PO" | "NP" | null
- `leadSuit`: Suit | null
- `leadRank`: Rank | null
- `resultMode`: "made" | "down"
- `resultValue`: number

Step transitions:
- Step 1 (Level) → Step 2 (Suit), or Step 6 (Confirm) for special outcomes
- Step 2 (Suit) → Step 3 (Declarer)
- Step 3 (Declarer) → Step 4 (Opening Lead) if lead required, else Step 5 (Result)
- Step 4 (Opening Lead) → Step 5 (Result)
- Step 5 (Result) → Step 6 (Confirm)
- Step 6 (Confirm) → submit

### File Location

All new components in: `src/components/play/contract-wizard/`
- `ContractWizard.tsx` — state machine parent
- `StepLevel.tsx` — level selection (step 1)
- `StepSuit.tsx` — suit selection (step 2)
- `StepDeclarer.tsx` — declarer + doubling (step 3)
- `StepOpeningLead.tsx` — opening lead entry (step 4, optional)
- `StepResult.tsx` — result entry (step 5)
- `StepConfirm.tsx` — confirmation & submit (step 6)

### Step 1: Level Selection

Uses `PageLayout` with header (event name, table/round info). Content area shows:
- "Not Played" button (grey)
- "Pass Out" button (grey)
- Level buttons 1-7 (large, grid layout — e.g., grid-cols-4 or grid-cols-3)

### Step 2: Suit Selection

Header shows contract-so-far context. Content shows 5 buttons:
- Uses suit symbols: "4♠", "4♥", "4♦", "4♣", "4NT"
- Buttons are colour-coded by suit (black for spades, red for hearts, orange for diamonds, green for clubs, grey for NT)

### Step 3: Declarer & Doubling

Header shows contract-so-far. Content shows:
- Top section: 3-button toggle for None / X / XX (smaller, like a segmented control)
- Main section: 4 large buttons showing full contract per direction:
  - "4♠N" / "4♠S" / "4♠E" / "4♠W" (when None)
  - "4♠NX" / "4♠SX" / "4♠EX" / "4♠WX" (when X)
  - "4♠NXX" / "4♠SXX" / "4♠EXX" / "4♠WXX" (when XX)

### Step 4: Opening Lead (optional)

Reuses the existing `InlineOpeningLead` component (suit + rank selection) within a PageLayout.
- Header: event name
- SubHeader: "Opening Lead"
- Actions: "Next" button (enabled when suit + rank selected)
- Next advances to Step 5 (Result)

### Step 5: Result

Reuses the existing `InlineBoardResult` component (Made/Down + number grid) within a PageLayout.
- Header: event name
- SubHeader: "Result"
- Actions: "Next" button (enabled when result selected)
- Next advances to Step 6 (Confirmation)

### Step 6: Confirmation

Shows the full summary of the entry prominently in the centre of the screen:
- Large text showing contract: "4♠ by North, Doubled"
- Opening lead: "Lead: ♠A" (if applicable)
- Result: "Made +1" or "Down 2"
- For special outcomes: just "Pass Out" or "Not Played"
- "Submit" button at the bottom (green, prominent)
- Back arrow goes to Result step (or Step 3 for special outcomes)

### Integration

`ContractWizard` replaces `EnterContractPage` in the play flow. It receives the same props:
- `round`, `table`, `roundBoards`, `leadCardRequired`
- `onComplete(data)` — called when the full entry (contract + lead + result) is submitted

### Board Selection

The board selector dropdown is shown on ALL steps via the subHeader bar (blue bar showing "Table X, Round Y" with the board dropdown on the right). This is rendered by `ContractWizard` and passed to each step as the `subHeader` prop for `PageLayout`.

When the user changes the board:
- The wizard remains on the current step with all entered data preserved — only the `selectedBoard` value changes, which determines which board the entry will be submitted for.

## Impact

- Delete: `EnterContractPage.tsx`, `PlayableContract.tsx`, `TabletCombinedEntry.tsx`, `InlineBoardResult.tsx` (or keep InlineBoardResult if reused), `BoardFlow.tsx`
- Delete: `DoubleSection.tsx`, `LevelSection.tsx`, `SuitSection.tsx`, `DeclarerSection.tsx`, `Section.tsx` (the old grid sections)
- Keep: `InlineOpeningLead.tsx` (reused in Step 4), `InlineBoardResult.tsx` (reused in Step 5)
