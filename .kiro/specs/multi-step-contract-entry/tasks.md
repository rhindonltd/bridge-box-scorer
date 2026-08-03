# Implementation Plan: Multi-Step Contract Entry

## Tasks

- [ ] 1. Create ContractWizard State Machine
  - [x] 1.1 Create `src/components/play/contract-wizard/ContractWizard.tsx`
    - Props: round, table, roundBoards, leadCardRequired, onComplete
    - State: step, level, suit, declarer, dbl, specialOutcome, leadSuit, leadRank, resultMode, resultValue
    - Renders the current step component based on state
    - Handles step transitions (forward/back)
    - _Requirements: 5, 6, 7_

- [ ] 2. Create Step Components
  - [~] 2.1 Create `StepLevel.tsx` — Level / Pass Out / Not Played selection
    - Large buttons for 1-7, Pass Out, Not Played
    - Uses PageLayout with event context header + board selector
    - _Requirements: 1_
  - [~] 2.2 Create `StepSuit.tsx` — Suit selection showing level in buttons
    - 5 buttons: {level}♠, {level}♥, {level}♦, {level}♣, {level}NT
    - Colour-coded by suit
    - Back navigation to Step 1
    - _Requirements: 2_
  - [~] 2.3 Create `StepDeclarer.tsx` — Declarer + doubling selection
    - Doubling toggle (None/X/XX) at top
    - 4 direction buttons showing full contract text
    - Back navigation to Step 2
    - _Requirements: 3_
  - [~] 2.4 Create `StepConfirm.tsx` — Confirmation screen
    - Shows full summary: contract + opening lead (if applicable) + result
    - "Submit" button submits the complete board data
    - Back navigation to Result step (or Step 3 for special outcomes)
    - _Requirements: 4_
  - [~] 2.5 Create `StepOpeningLead.tsx` — Opening lead entry
    - Reuses InlineOpeningLead within PageLayout
    - "Next" button advances to Result step (enabled when suit + rank selected)
    - _Requirements: 7.1_
  - [~] 2.6 Create `StepResult.tsx` — Result entry
    - Reuses InlineBoardResult within PageLayout
    - "Next" button advances to Confirmation step (enabled when result selected)
    - _Requirements: 7.3, 7.4_

- [ ] 3. Integrate into Play Flow
  - [~] 3.1 Replace `EnterContractPage` usage in the play route with `ContractWizard`
    - Update `src/app/play/[gameId]/[initialSeat]/page.tsx` or wherever EnterContractPage is rendered
    - _Requirements: 6.4_
  - [~] 3.2 Remove `TabletCombinedEntry` usage and the responsive `BoardFlow` wrapper
    - _Requirements: 6.3_

- [ ] 4. Write Tests
  - [~] 4.1 Unit tests for ContractWizard state transitions
  - [~] 4.2 Unit tests for each step component
  - [~] 4.3 Storybook stories for each step

- [ ] 5. Clean Up Old Components
  - [~] 5.1 Delete `EnterContractPage.tsx` (and its test/stories)
  - [~] 5.2 Delete `PlayableContract.tsx` (and its test/stories)
  - [~] 5.3 Delete `TabletCombinedEntry.tsx` (and its stories)
  - [~] 5.4 Delete old section components (`LevelSection`, `SuitSection`, `DeclarerSection`, `DoubleSection`, `Section`) if no longer used
  - [~] 5.5 Delete `BoardFlow.tsx` if no longer used

- [ ] 6. Final Verification
  - [~] 6.1 Run full test suite
  - [~] 6.2 Run build
  - [~] 6.3 Manual/visual verification in Storybook

## Task Dependency Graph

<!-- Flow order: StepLevel → StepSuit → StepDeclarer → StepOpeningLead → StepResult → StepConfirm -->
<!-- For special outcomes (Pass Out / Not Played): StepLevel → StepConfirm (skipping steps 2-5) -->

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
