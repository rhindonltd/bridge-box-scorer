"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DirectorLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/director/status")
      .then((r) => r.json())
      .then((data) => {
        setPasswordSet(data.passwordSet);
      });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/director/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Incorrect password");
      setLoading(false);
      return;
    }

    const data = await res.json();

    localStorage.setItem("directorToken", data.token);

    router.push("/director/events");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/director/set-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Could not set password");
      setLoading(false);
      return;
    }

    setPasswordSet(true);
    setPassword("");
    setConfirm("");
    setLoading(false);
  }

  if (passwordSet === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Bridge Director</h1>

        {passwordSet ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-sm font-medium text-gray-600 text-center">
              Director Login
            </h2>

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-blue-500"
            />

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg
              hover:bg-blue-700 transition
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="text-sm font-medium text-gray-600 text-center">
              Create Director Password
            </h2>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-blue-500"
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-blue-500"
            />

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg
              hover:bg-blue-700 transition
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Password"}
            </button>
          </form>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
