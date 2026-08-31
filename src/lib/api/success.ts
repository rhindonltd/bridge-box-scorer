import { NextResponse } from "next/server";

export function success(result: any) {
  return NextResponse.json({ success: true, result });
}
