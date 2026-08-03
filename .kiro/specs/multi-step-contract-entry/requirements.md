# Requirements: Multi-Step Contract Entry

## Introduction

Replace the current single-screen contract entry with a multi-step wizard flow. Each step presents a focused choice with large, clear buttons. This is simpler for non-technical users (typically aged 70+) and works identically on mobile and tablet.

## Requirements

### Requirement 1: Step 1 — Level Selection

**User Story:** As a player, I want to select the contract level (or mark the board as Pass Out / Not Played) on a dedicated screen with large buttons, so that I can clearly see my options.

#### Acceptance Criteria

1. THE screen SHALL display buttons for "Not Played", "Pass Out", and levels 1 through 7.
2. WHEN "Not Played" is tapped, THE flow SHALL advance to the Confirmation step with outcome "NP".
3. WHEN "Pass Out" is tapped, THE flow SHALL advance to the Confirmation step with outcome "PO".
4. WHEN a level (1-7) is tapped, THE flow SHALL advance to Step 2 (Suit Selection).
5. THE screen SHALL display the current board number and table/round context in the page header.

### Requirement 2: Step 2 — Suit Selection

**User Story:** As a player, after choosing a level, I want to select the suit on its own screen showing the level incorporated into each option, so that I can see the contract building up.

#### Acceptance Criteria

1. THE screen SHALL display buttons for each suit option incorporating the selected level: e.g., "4♠", "4♥", "4♦", "4♣", "4NT".
2. WHEN a suit button is tapped, THE flow SHALL advance to Step 3 (Declarer Selection).
3. THE user SHALL be able to go back to Step 1 to change the level.
4. THE screen SHALL show the contract-so-far in the header or as context (e.g., "Level: 4").

### Requirement 3: Step 3 — Declarer & Doubling

**User Story:** As a player, I want to select the declarer and optionally the doubling on one screen, with the full contract shown on each button so I can see exactly what I'm selecting.

#### Acceptance Criteria

1. THE screen SHALL display a doubling toggle at the top with options: None (default), X, XX.
2. Below the toggle, THE screen SHALL display 4 buttons, one for each direction (N, S, E, W), showing the full contract: e.g., "4♠N", "4♠S", "4♠E", "4♠W".
3. WHEN the doubling toggle is changed to X, THE direction buttons SHALL update to show the suffix: e.g., "4♠NX", "4♠SX", "4♠EX", "4♠WX".
4. WHEN the doubling toggle is changed to XX, THE direction buttons SHALL update to show: e.g., "4♠NXX", "4♠SXX", etc.
5. WHEN a direction button is tapped, THE flow SHALL advance to Opening Lead entry (Step 4) if opening lead is required, or to Result entry (Step 5) if not required.
6. THE user SHALL be able to go back to Step 2 to change the suit.

### Requirement 4: Confirmation Screen

**User Story:** As a player, I want to see the full summary of my entry (contract, opening lead, and result) clearly displayed before submitting, with the ability to correct any part by going back.

#### Acceptance Criteria

1. THE screen SHALL display the full contract prominently (e.g., "4♠ by North, Doubled" or "4♠N X").
2. THE screen SHALL display the opening lead (if applicable) prominently (e.g., "Lead: ♠A").
3. THE screen SHALL display the result prominently (e.g., "Made +1" or "Down 2").
4. THE screen SHALL display a "Submit" button.
5. WHEN "Submit" is tapped, THE flow SHALL submit the complete board data (contract + lead + result).
6. THE user SHALL be able to tap a "Back" button to navigate back to Result entry (or Step 3 for special outcomes).
7. FOR special outcomes (Pass Out, Not Played), THE confirmation screen SHALL display the outcome text and a "Submit" button.

### Requirement 5: Back Navigation

**User Story:** As a player, I want to go back to the previous step at any point to correct my entry without starting over.

#### Acceptance Criteria

1. EACH step (except Step 1) SHALL have a back affordance (back arrow in header or back button).
2. WHEN back is tapped on Step 2, THE flow SHALL return to Step 1 with the previously selected level highlighted.
3. WHEN back is tapped on Step 3, THE flow SHALL return to Step 2 with the previously selected suit highlighted.
4. WHEN back is tapped on Opening Lead, THE flow SHALL return to Step 3 (Declarer).
5. WHEN back is tapped on Result, THE flow SHALL return to Opening Lead (or Step 3 if lead not required).
6. WHEN back is tapped on Confirmation, THE flow SHALL return to Result entry.

### Requirement 6: Replaces Existing Contract Entry

**User Story:** As a developer, I want a single contract entry flow that works on all devices, replacing the current `EnterContractPage` and `TabletCombinedEntry` approaches.

#### Acceptance Criteria

1. THE new multi-step flow SHALL be used on both mobile and tablet devices.
2. THE existing `PlayableContract` component (4-section grid) SHALL no longer be used for player contract entry.
3. THE existing `TabletCombinedEntry` component SHALL no longer be used.
4. THE new flow SHALL integrate with the existing board selection, opening lead, and result entry flow.

### Requirement 7: Opening Lead & Result Flow

**User Story:** As a player, after selecting a declarer, I want to enter the opening lead (if required) and result before seeing the final confirmation.

#### Acceptance Criteria

1. AFTER declarer selection (Step 3), IF opening lead is required, THE flow SHALL show an Opening Lead entry screen.
2. AFTER opening lead (or immediately after declarer selection if lead not required), THE flow SHALL show a Result entry screen.
3. THE Result screen SHALL show Made/Down toggle and number selection.
4. AFTER result entry, THE flow SHALL advance to the Confirmation screen.

### Requirement 8: Board Selection Available on All Steps

**User Story:** As a player, I want to be able to switch between boards at any point during entry, so that I can enter results in any order.

#### Acceptance Criteria

1. THE board selector (dropdown showing available boards for the round) SHALL be visible on every step via the subHeader bar.
2. WHEN the board is changed, THE wizard SHALL remain on the current step with the current entry data — only the target board for submission changes.
3. IF a board already has a submitted result, THE board selector SHOULD indicate this visually (e.g., different styling or a checkmark).
