import {NextRequest, NextResponse} from "next/server"

export function middleware(req: NextRequest) : NextResponse | undefined {

    const isDirector = req.cookies.get("director")

    if (req.nextUrl.pathname.startsWith("/director") && !isDirector) {
        return NextResponse.redirect(new URL("/login", req.url))
    }
}
