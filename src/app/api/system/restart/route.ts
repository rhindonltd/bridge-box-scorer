import { withBasicRoute } from "@/lib/api/basicRoute";
import { exec } from "child_process";
import { success } from "@/lib/api/success";

export const POST = withBasicRoute(async () => {
  exec("sudo /usr/local/bridgebox/bin/restart-service.sh");

  return success({ message: "Restarting system..." });
});
