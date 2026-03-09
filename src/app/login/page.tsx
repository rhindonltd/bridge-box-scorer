"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DirectorLoginPage() {
    const router = useRouter()

    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [passwordSet, setPasswordSet] = useState<boolean | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetch("/api/director/status")
            .then((r) => r.json())
            .then((data) => {
                setPasswordSet(data.passwordSet)
            })
    }, [])

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        const res = await fetch("/api/director/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        })

        if (!res.ok) {
            setError("Incorrect password")
            setLoading(false)
            return
        }

        const data = await res.json()

        localStorage.setItem("directorToken", data.token)

        router.push("/director/start-session")
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()

        if (password !== confirm) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)
        setError("")

        const res = await fetch("/api/director/set-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        })

        if (!res.ok) {
            setError("Could not set password")
            setLoading(false)
            return
        }

        setPasswordSet(true)
        setPassword("")
        setConfirm("")
        setLoading(false)
    }

    if (passwordSet === null) {
        return <div>Loading...</div>
    }

    return (
        <div style={container}>
            <h1>Bridge Director</h1>

            {passwordSet ? (
                <form onSubmit={handleLogin} style={form}>
                    <h2>Director Login</h2>

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={input}
                    />

                    <button disabled={loading} style={button}>
                        Login
                    </button>
                </form>
            ) : (
                <form onSubmit={handleCreate} style={form}>
                    <h2>Create Director Password</h2>

                    <input
                        type="password"
                        placeholder="New password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={input}
                    />

                    <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        style={input}
                    />

                    <button disabled={loading} style={button}>
                        Create Password
                    </button>
                </form>
            )}

            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    )
}

const container: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "sans-serif"
}

const form: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "260px"
}

const input: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px"
}

const button: React.CSSProperties = {
    padding: "10px",
    fontSize: "16px"
}