import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { triggerCloudSync } from "@/lib/system/cloud-sync";

// Trigger an on-demand cloud sync ("back up now"). Device action, so it is
// gated by the admin token like restart/reboot. Fire-and-forget: the helper
// starts the sync non-blocking and returns immediately, so a 200 means "sync
// started", not "sync finished" — the outcome is read back via the status
// endpoint. Safe to call repeatedly (systemd coalesces an in-flight run).
export const POST = withAdminRoute(async ({ log }) => {
  log.info("Cloud sync requested via admin API");
  triggerCloudSync(log);
  return success({ message: "Cloud sync started" });
});
