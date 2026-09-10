import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";

/**
 * GET /api/system/admin-key/validate
 *
 * Confirms that the `x-admin-token` header corresponds to a currently-valid
 * ADMIN login session. `withAdminRoute` does the actual check: it returns 401
 * for a missing, stale, or non-admin token, and only invokes this handler when
 * the token is valid.
 *
 * The settings UI calls this on load to decide whether to unlock — the client
 * must NOT trust the mere presence of a token in localStorage, since a stale or
 * bogus value would otherwise bypass the admin-key prompt.
 */
export const GET = withAdminRoute(async () => {
  return success({ valid: true });
});
