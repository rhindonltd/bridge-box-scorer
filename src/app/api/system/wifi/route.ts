import fs from "fs";

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ssid, password } = body;

        if (!ssid || !password) {
            return Response.json(
                { error: "Missing ssid or password" },
                { status: 400 }
            );
        }

        fs.writeFileSync(
            WIFI_CONFIG,
            JSON.stringify({ ssid, password }, null, 2)
        );

        return Response.json({
            success: true,
            message: "WiFi saved. Restart required.",
        });
    } catch (err) {
        return Response.json(
            { error: "Failed to save WiFi" },
            { status: 500 }
        );
    }
}
