# Requirements: Correct Result

## Requirement 1

**User Story:** As a director, I want to select a board number from a grid of all boards in the game, so that I can identify which board needs correction.

### Acceptance Criteria

1. WHEN the director opens the Correct Result page THEN the system SHALL display a grid of all distinct board numbers that exist in the game
2. WHEN board numbers are displayed THEN the system SHALL fetch them via a dedicated API endpoint that detects the game type (PAIRS vs INDIVIDUAL)

## Requirement 2

**User Story:** As a director, I want to see all instances of a selected board played at different tables, so that I can pick the specific instance to correct.

### Acceptance Criteria

1. WHEN the director selects a board number THEN the system SHALL display all instances of that board showing participant names and the current result
2. WHEN displaying instances for a PAIRS game THEN the system SHALL show NS and EW pair identifiers with player names
3. WHEN displaying instances for an INDIVIDUAL game THEN the system SHALL show N, S, E, W player identifiers with player names
4. WHEN an instance has an existing director override THEN the system SHALL display the override result as the current result

## Requirement 3

**User Story:** As a director, I want to enter a corrected contract for the selected board instance, so that I can fix incorrectly entered results or void boards.

### Acceptance Criteria

1. WHEN the director selects an instance THEN the system SHALL present the contract entry interface with level, suit, declarer, and doubling selectors
2. WHEN the director selects "Pass Out" THEN the system SHALL record the outcome as "PO" and skip the result entry step
3. WHEN the director selects "Not Played" THEN the system SHALL record the outcome as "NP" and skip the result entry step (this acts as voiding the board)
4. WHEN the director enters a valid contract THEN the system SHALL proceed to the result entry step

## Requirement 4

**User Story:** As a director, I want to enter the number of tricks made or down for the corrected contract, so that the full result can be recorded.

### Acceptance Criteria

1. WHEN entering the result THEN the system SHALL display a Made/Down toggle and an overtricks/undertricks grid
2. WHEN the director selects Made and a number of overtricks THEN the system SHALL encode the result as a positive offset (e.g., "=" for exact, "+1" for one overtrick)
3. WHEN the director selects Down and a number of undertricks THEN the system SHALL encode the result as a negative offset (e.g., "-1" for one down)
4. WHEN the result is combined with the contract THEN the system SHALL produce a valid PlayedContractCode (e.g., "3NTN=", "2SXE-2")

## Requirement 5

**User Story:** As a director, I want to save the corrected result, so that it overrides the player-entered result and is used in scoring.

### Acceptance Criteria

1. WHEN the director saves the override THEN the system SHALL write the result to the `director_override_result` column for the specific board instance
2. WHEN the override is saved THEN the system SHALL set the board's status to `OVERRIDDEN`
3. WHEN saving the override THEN the system SHALL validate that the caller is an authorised director for this game using the director token
4. WHEN the override is saved successfully THEN the system SHALL navigate back to the director menu

## Requirement 6

**User Story:** As a director, I want the Correct Result flow to be accessible from the Director Menu, so that I can easily navigate to it.

### Acceptance Criteria

1. WHEN the director clicks "Correct Result" on the Director Menu THEN the system SHALL navigate to `/manage/[id]/correct-result`

## Requirement 7

**User Story:** As a director, I want the contract entry to be decoupled from the player play flow, so that it can be reused without requiring play-specific contexts.

### Acceptance Criteria

1. WHEN reusing the contract entry UI THEN the system SHALL extract a standalone `ContractEntryPanel` component that does not depend on `usePlay()` or `useAssignment()` contexts
2. WHEN the director uses the contract entry THEN the system SHALL display a context bar showing "Correcting Board X" instead of the player game info
