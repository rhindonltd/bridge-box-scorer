import { NextResponse } from "next/server";
import { verifyDirectorPassword } from "@/server/auth/directorAuth";
import { createDirectorSession } from "@/server/auth/sessions";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password } = body;

        const valid = await verifyDirectorPassword(password);

        if (!valid) {
            return NextResponse.json({ success: false }, { status: 401 });
        }

        const token = createDirectorSession();
        console.log("Created token")

        // Set HTTP-only cookie
        const response = NextResponse.json({ success: true, token });
        response.cookies.set("directorToken", token, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24, // 1 day
            sameSite: "lax",
        });

        return response;
    } catch (err) {
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}