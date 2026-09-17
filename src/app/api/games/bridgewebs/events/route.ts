import { NextResponse } from "next/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { getBridgewebsCredentials } from "@/db/system/queries/bridgewebs-credentials";
import {
  fetchEventsForDay,
  type BridgewebsEvent,
} from "@/lib/bridgewebs/client";

export type BridgewebsEventsResponse = {
  configured: boolean;
  events: BridgewebsEvent[];
};

/**
 * GET /api/games/bridgewebs/events?date=YYYY-MM-DD
 *
 * Returns the BridgeWebs calendar events for a day, used by the create-game
 * page to offer an event picker. Behaviour is intentionally forgiving so the
 * create page degrades cleanly:
 *  - not configured -> { configured: false, events: [] }
 *  - configured but the remote call fails (offline venue, bad credentials) ->
 *    { configured: true, events: [] }, HTTP 200. The picker simply shows no
 *    events rather than erroring the whole page.
 */
export const GET = withBasicRoute(async ({ req, log }) => {
  const dateParam = req.nextUrl.searchParams.get("date")?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
  if (!match) {
    return NextResponse.json(
      { success: false, error: "A date (YYYY-MM-DD) is required" },
      { status: 400 },
    );
  }

  const credentials = await getBridgewebsCredentials();
  if (!credentials) {
    return success<BridgewebsEventsResponse>({ configured: false, events: [] });
  }

  // BridgeWebs expects the date as YYYYMMDD.
  const date = `${match[1]}${match[2]}${match[3]}`;

  try {
    const events = await fetchEventsForDay(
      credentials.club,
      credentials.password,
      date,
    );
    return success<BridgewebsEventsResponse>({ configured: true, events });
  } catch (err) {
    log.warn({ err }, "Failed to fetch BridgeWebs events");
    return success<BridgewebsEventsResponse>({ configured: true, events: [] });
  }
});
