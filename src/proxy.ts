import {NextRequest, NextResponse} from "next/server"

export function proxy(req: NextRequest) : NextResponse | undefined {

    const isDirector = req.cookies.get("directorToken")

    if (req.nextUrl.pathname.startsWith("/director") && !isDirector) {
        return NextResponse.redirect(new URL("/login", req.url))
    }
}
