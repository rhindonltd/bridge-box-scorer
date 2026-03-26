import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export async function GET() {
    try {
        const { stdout } = await execAsync(
            "nmcli -t -f ACTIVE,SSID dev wifi | egrep '^yes'"
        );

        const currentSSID = stdout.split(":")[1] || null;

        let savedConfig = null;
        if (fs.existsSync(WIFI_CONFIG)) {
            savedConfig = JSON.parse(fs.readFileSync(WIFI_CONFIG, "utf-8"));
        }

        return Response.json({
            connected: !!currentSSID,
            currentSSID,
            savedSSID: savedConfig?.ssid ?? null,
        });
    } catch (err) {
        return Response.json(
            { error: "Failed to get network status" },
            { status: 500 }
        );
    }
}