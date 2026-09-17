import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { deleteLoginSession } from "@/db/system/actions/delete-login-session";

/**
 * POST /api/system/admin-key/logout
 *
 * Invalidates the current ADMIN session server-side by deleting its login
 * session row, so the token cannot be reused even if it was copied. The client
 * clears its stored token separately. `withAdminRoute` guarantees the
 * `x-admin-token` header is present and valid before this handler runs.
 */
export const POST = withAdminRoute(async ({ req }) => {
  const token = req.headers.get("x-admin-token");
  if (token) {
    await deleteLoginSession(token);
  }

  return success({ loggedOut: true });
});
