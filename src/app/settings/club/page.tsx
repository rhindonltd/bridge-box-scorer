"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClubSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clubNumber, setClubNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/system/club")
      .then((r) => r.json())
      .then((data) => {
        if (data.club) {
          setName(data.club.name);
          setClubNumber(data.club.clubNumber);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clubNumber.trim()) {
      setMessage("Both fields are required");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clubNumber: clubNumber.trim(),
        }),
      });

      if (res.ok) {
        setMessage("✅ Club info saved");
      } else {
        const data = await res.json();
        setMessage(data.error ?? "Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        Club Information
      </div>

      <form
        onSubmit={handleSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <div>
            <label
              htmlFor="club-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Club Name
            </label>
            <input
              id="club-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anytown Bridge Club"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="club-number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              EBU Club Number
            </label>
            <input
              id="club-number"
              type="text"
              value={clubNumber}
              onChange={(e) => setClubNumber(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {message && (
            <p
              className={`text-base text-center ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
