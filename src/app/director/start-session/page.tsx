'use client'

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"

export default function StartSessionPage() {
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        socketRef.current = io("http://localhost:3000", { auth: {
            token: localStorage.getItem("directorToken")
        }})

        return () => {
            socketRef.current?.disconnect()
        }
    }, [])

    const handleStart = () => {
        socketRef.current?.emit("director:startSession")
    }

    return <button onClick={handleStart}>Start Session</button>
}