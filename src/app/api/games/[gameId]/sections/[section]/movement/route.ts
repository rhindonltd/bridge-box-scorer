import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorEditRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { broadcastSectionMovementChanged } from "@/socket/broadcast/section-broadcast";
import {
  SelectedMovement,
  withStationaryHistory,
} from "@/model/selected-movement";
import { getSwissBoardHistory } from "@/db/games/queries/swiss-board-history";
import {
  mitchellSpecSchema,
  swissSpecSchema,
  swissTeamsSpecSchema,
  americanWhistTeamsSpecSchema,
  circulationTeamsSpecSchema,
} from "@/model/selected-movement";
import { getTeamMovementDetail } from "@/modules/movement-catalog/server";

const bodySchema = z.object({
  id: z.number().int().positive().optional(),
  /** A stored teams movement's id (from the teams library), with boardsPerRound. */
  teamsSpecId: z.number().int().positive().optional(),
  boardsPerRound: z.number().int().positive().optional(),
  mitchell: mitchellSpecSchema.optional(),
  swiss: swissSpecSchema.optional(),
  swissTeams: swissTeamsSpecSchema.optional(),
  americanWhistTeams: americanWhistTeamsSpecSchema.optional(),
  circulationTeams: circulationTeamsSpecSchema.optional(),
});

/**
 * PUT /api/games/[gameId]/sections/[section]/movement — set (or clear) the
 * section's movement. A `mitchell` spec, a spec `id` + `boardsPerRound`, a
 * teams library `teamsSpecId` + `boardsPerRound`, an `americanWhistTeams` or
 * `circulationTeams` spec, or an empty body (clear) are accepted. On an actual change, the section's timer is
 * cleared (its round structure is derived from the movement).
 */
export const PUT = withDirectorEditRoute(
  async ({ gameId, db, section, body }) => {
    if (!section) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const {
      id,
      teamsSpecId,
      boardsPerRound,
      mitchell,
      swiss,
      swissTeams,
      americanWhistTeams,
      circulationTeams,
    } = body;

    let selected: SelectedMovement | null;
    if (americanWhistTeams) {
      selected = { source: "AMERICAN_WHIST_TEAMS", americanWhistTeams };
    } else if (circulationTeams) {
      selected = { source: "CIRCULATION_TEAMS", circulationTeams };
    } else if (swissTeams) {
      selected = { source: "SWISS_TEAMS", swissTeams };
    } else if (swiss) {
      selected = { source: "SWISS", swiss };
    } else if (mitchell) {
      selected = { source: "MITCHELL", mitchell };
    } else if (teamsSpecId != null) {
      if (boardsPerRound == null) {
        return NextResponse.json(
          { success: false, error: "No boards per round specified" },
          { status: 400 },
        );
      }
      // Only a teams movement the app can run may be selected.
      if ((await getTeamMovementDetail(teamsSpecId)) == null) {
        return NextResponse.json(
          { success: false, error: "Unknown teams movement" },
          { status: 400 },
        );
      }
      selected = { source: "TEAMS_SPEC", specId: teamsSpecId, boardsPerRound };
    } else if (id != null) {
      if (boardsPerRound == null) {
        return NextResponse.json(
          { success: false, error: "No boards per round specified" },
          { status: 400 },
        );
      }
      selected = { source: "SPEC", specId: id, boardsPerRound };
    } else {
      // No movement specified clears the section's selection.
      selected = null;
    }

    try {
      // Read the previous selection first so the broadcaster only clears the
      // timer when the movement actually changed.
      const previous = await getSectionMovement(db, section);
      // A change to a Swiss section's stationary pairs applies to rounds drawn
      // from now on; record the list the rounds already drawn were played under
      // so they keep it (see withStationaryHistory). Any history a client sends
      // is ignored.
      if (selected?.source === "SWISS") {
        const highestRound =
          previous?.source === "SWISS"
            ? (await getSwissBoardHistory(db, section, previous.swiss.tables))
                .highestRound
            : 0;
        selected = withStationaryHistory(previous, selected, highestRound);
      }
      await setSectionMovement(gameId, section, selected);

      await broadcastSectionMovementChanged(
        gameId,
        section,
        previous,
        selected,
      );
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to set movement for section ${section} in game ${gameId}:`,
      );
    }
  },
  { bodySchema },
);
