import { NextResponse } from "next/server"
import { directorPasswordExists } from "@/server/auth/directorAuth";

export async function GET() {
    return NextResponse.json({
        passwordSet: directorPasswordExists()
    })
}
