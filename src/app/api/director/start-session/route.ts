import { NextResponse } from "next/server"
import db from "@/db"

export async function POST() {

    db.prepare(`
    INSERT OR REPLACE INTO settings (key,value)
    VALUES ('session_started','true')
  `).run()

    return NextResponse.json({ success: true })
}
