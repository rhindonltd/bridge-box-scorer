import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { readCloudSyncStatus } from "@/lib/system/cloud-sync";

// Read the box's advisory last-sync status. The status carries no secrets and
// is only surfaced inside the admin-gated settings area, so — like the
// BridgeWebs status GET — it uses the basic (unauthenticated) route wrapper. A
// missing/unreadable status file degrades to a "not enabled" status rather than
// erroring (see readCloudSyncStatus).
export const GET = withBasicRoute(async () => {
  return success(readCloudSyncStatus());
});
