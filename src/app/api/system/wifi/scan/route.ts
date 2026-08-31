import { withBasicRoute } from "@/lib/api/basicRoute";
import { exec } from "child_process";
import { NextResponse } from "next/server";
import { promisify } from "util";
import { success } from "@/lib/api/success"

const execAsync = promisify(exec);

export const POST = withBasicRoute(async () => {
  const { stdout } = await execAsync(
    "nmcli -t -f SSID,SECURITY,SIGNAL dev wifi list",
  );

  const networks = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [ssid, security, signal] = line.split(":");
      return {
        ssid,
        security,
        signal: Number(signal),
      };
    })
    .filter((n) => n.ssid !== "");

  // Remove duplicates (same SSID)
  const unique = Object.values(
    Object.fromEntries(networks.map((n) => [n.ssid, n])),
  );

  return success({ ssids: unique });
});
