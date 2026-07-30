# Requirements: View Round Status

## Requirement 1

**User Story:** As a director, I want to see the current round and board entry progress for each table, so that I can monitor game progress at a glance.

### Acceptance Criteria

1. WHEN the director requests round status THEN the system SHALL return the current round for each table (the highest round with at least one entered board)
2. WHEN the director requests round status THEN the system SHALL return how many boards have been entered in each table's current round versus the total boards for that round
3. WHEN a table has scores from a later round but is missing scores from a previous round THEN the system SHALL flag that table with a warning indicating which earlier rounds have gaps

## Requirement 2

**User Story:** As a director, I want the round status to correctly identify "entered" boards across both game types, so that I get accurate progress information.

### Acceptance Criteria

1. WHEN a pairs board has a non-null `nsResult` THEN the system SHALL consider that board entered
2. WHEN an individual board has a non-null `nResult` THEN the system SHALL consider that board entered
3. WHEN a board has a non-null `directorOverrideResult` THEN the system SHALL consider that board entered regardless of other result fields
4. WHEN a board has status `NOT_PLAYED` THEN the system SHALL consider that board entered (it is resolved)

## Requirement 3

**User Story:** As a director, I want to view the round status page from the director menu and have it auto-refresh, so that I can leave it on screen and see updates without manual intervention.

### Acceptance Criteria

1. WHEN the director clicks "View Round Status" in the director menu THEN the system SHALL navigate to the round status page
2. WHEN the round status page is displayed THEN the system SHALL auto-refresh the data every 10 seconds
3. WHEN the round status page is displayed THEN the system SHALL show a card for each table with table number, round progress, and any warning indicators
