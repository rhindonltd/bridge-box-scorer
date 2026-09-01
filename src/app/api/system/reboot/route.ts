import { withAdminRoute } from "@/lib/api/adminRoute";
import { exec } from "child_process";
import { success } from "@/lib/api/success";

export const POST = withAdminRoute(async () => {
  exec("sudo /usr/local/bridgebox/bin/reboot.sh");

  return success({ message: "Rebooting device..." });
});
