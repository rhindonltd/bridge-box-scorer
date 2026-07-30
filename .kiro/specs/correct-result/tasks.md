# Implementation Plan: Correct Result

## Overview

Implement a multi-step director wizard for correcting board results. The approach is: build API endpoints and extract the reusable ContractEntryPanel in parallel, then build the new page-level components that depend on them, then wire the wizard page together, and finally connect it to the director menu.

## Tasks

- [x] 1. API endpoints for board data
  - [x] 1.1 Create `src/app/api/games/[gameId]/boards/route.ts`
    - Implement GET handler that looks up game type from game index
    - Open the appropriate game database (pairs or individual)
    - Query `SELECT DISTINCT board_number FROM boards ORDER BY board_number`
    - Return `{ boards: number[] }`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create `src/app/api/games/[gameId]/boards/[boardNumber]/route.ts`
    - Implement GET handler that determines game type from game index
    - Query all board records for the given boardNumber
    - For PAIRS: join with pairs/participants tables to get player names, format as "Player1 & Player2"
    - For INDIVIDUAL: join with individual/participants and players tables to get names for each seat
    - Compute `currentResult` as `directorOverrideResult ?? nsResult` (pairs) or `directorOverrideResult ?? nResult` (individual)
    - Return `{ instances: BoardInstance[] }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.3 Create `src/app/api/games/[gameId]/boards/[boardNumber]/override/route.ts`
    - Implement POST handler accepting `{ roundNumber, tableNumber, result, directorToken }`
    - Validate director token using `validateDirectorToken(token, gameId)`
    - Return 401 if invalid
    - Update the board record: set `director_override_result` and `status` to `"OVERRIDDEN"`
    - Return `{ success: true }`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Extract ContractEntryPanel and enable BoardResult footer
  - [x] 2.1 Create `src/components/contract/ContractEntryPanel.tsx`
    - Extract the contract selection UI from `EnterContractPage.tsx`
    - Props: `{ headerText: string; subHeaderText?: string; onOk: (contract: ContractCode | SpecialBoardOutcome) => void }`
    - Internally manage `level`, `suit`, `declarer`, `dbl`, `passOut`, `notPlayed` state
    - Render context bar with `headerText`, Pass Out / Not Played buttons, PlayableContract grid, and submit button
    - No dependency on `usePlay()`, `useAssignment()`, or `useGame()`
    - _Requirements: 7.1, 7.2_

  - [x] 2.2 Refactor `src/components/pages/play/EnterContractPage.tsx` to wrap `ContractEntryPanel`
    - Replace inline contract UI with `<ContractEntryPanel>` component
    - Keep existing context usage (usePlay, useGame, useAssignment) in the outer component
    - Pass game/participant info as `headerText` prop
    - Ensure existing player flow is unchanged
    - _Requirements: 7.1_

  - [x] 2.3 Enable the footer in `src/components/play/BoardResult.tsx`
    - Uncomment the Continue button in the footer section
    - Compute `result` from `mode` and `value` (made = value, down = -value)
    - Wire `onClick` to call `onSave(result)`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build the `buildPlayedContractCode` utility
  - [x] 4.1 Create `src/lib/buildPlayedContractCode.ts`
    - Implement `buildPlayedContractCode(level, suit, doubling, declarer, trickResult)` returning a `PlayedContractCode`
    - Contract part: `${level}${suit}${doubling}${declarer}`
    - Result part: `"="` for 0, `"+N"` for positive, `"-N"` for negative
    - Return the concatenation as `PlayedContractCode`
    - _Requirements: 4.4_

  - [ ]* 4.2 Write property test for `buildPlayedContractCode`
    - **Property 2: PlayedContractCode construction validity**
    - For any valid level (1-7), suit (S/H/D/C/NT), doubling (""/X/XX), declarer (N/E/S/W), and trick result (0, +1 to +6, -1 to -7), output matches `^[1-7](S|H|D|C|NT)(X|XX)?[NESW](=|\+[1-6]|-[1-7])$`
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 5. New page-level components
  - [x] 5.1 Create `src/components/pages/manage/correct-result/SelectBoardPage.tsx`
    - Props: `{ boards: number[]; isLoading: boolean; onBoardSelected: (boardNumber: number) => void }`
    - Render header with game name via `useGame()`
    - Render grid of board number buttons with `bg-gray-200 text-gray-800 rounded-xl` styling
    - Show "No boards found" if array is empty and not loading
    - _Requirements: 1.1_

  - [x] 5.2 Create `src/components/pages/manage/correct-result/SelectInstancePage.tsx`
    - Props: `{ boardNumber: number; instances: BoardInstance[]; isLoading: boolean; onInstanceSelected: (instance: BoardInstance) => void }`
    - Render list of cards with participant names and current result
    - For PAIRS: show "NS: Name & Name" and "EW: Name & Name"
    - For INDIVIDUAL: show N, S, E, W player names
    - Card styling: `bg-gray-50 border border-gray-200 rounded-xl`
    - Show "No instances found" if array is empty and not loading
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Wizard page
  - [x] 6.1 Create `src/app/manage/[id]/correct-result/page.tsx`
    - Implement `WizardStep` state machine with steps: selectBoard, selectInstance, enterContract, enterResult, saving
    - On `selectBoard`: fetch `/api/games/[gameId]/boards`, render `SelectBoardPage`
    - On `selectInstance`: fetch `/api/games/[gameId]/boards/[boardNumber]`, render `SelectInstancePage`
    - On `enterContract`: render `ContractEntryPanel` with `headerText="Correcting Board X"`
    - If contract is "PO" or "NP", transition directly to `saving`
    - On `enterResult`: render `BoardResult`, on save call `buildPlayedContractCode` and transition to `saving`
    - On `saving`: POST to override endpoint with director token from localStorage, navigate to menu on success
    - Handle errors: show toast on failure, allow retry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.2, 5.3, 5.4_

- [x] 7. Wire to Director Menu
  - [x] 7.1 Update `src/app/manage/[id]/menu/page.tsx`
    - Change `onCorrectResultClick` from `alert("Coming soon")` to `router.push(\`/manage/${id}/correct-result\`)`
    - _Requirements: 6.1_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The existing `GameProviderClient` context in the `/manage/[id]` layout provides game data to all child routes
- Director token is read from localStorage via existing `getDirectorToken(gameId)` utility
- The scoring pipeline already handles override precedence (`directorOverrideResult ?? nsResult`) so no scoring changes are needed
- Property tests validate the `buildPlayedContractCode` utility since it has clear correctness constraints

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1", "2.3", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.2"] },
    { "id": 2, "tasks": ["5.1", "5.2"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["7.1"] }
  ]
}
```
