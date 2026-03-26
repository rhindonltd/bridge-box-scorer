import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
    try {
        const { stdout } = await execAsync(
            "nmcli -t -f SSID,SECURITY,SIGNAL dev wifi list"
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
            Object.fromEntries(
                networks.map((n) => [n.ssid, n])
            )
        );

        return Response.json(unique);
    } catch {
        return Response.json(
            { error: "Failed to scan WiFi" },
            { status: 500 }
        );
    }
}
