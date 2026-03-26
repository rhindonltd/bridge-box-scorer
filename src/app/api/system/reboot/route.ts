import { exec } from "child_process";

export async function POST() {
  exec("sudo /usr/local/bridgebox/bin/reboot.sh");

  return Response.json({
    success: true,
    message: "Rebooting device...",
  });
}
