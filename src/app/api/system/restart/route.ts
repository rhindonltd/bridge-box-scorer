import { exec } from "child_process";

export async function POST() {
    exec("sudo /usr/local/bridgebox/bin/restart-service.sh");

    return Response.json({
        success: true,
        message: "Restarting system...",
    });
}
