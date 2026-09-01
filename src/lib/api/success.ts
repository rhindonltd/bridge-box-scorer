import { NextResponse } from "next/server";

export function success<T>(result: T) {
  return NextResponse.json({ success: true, result });
}
