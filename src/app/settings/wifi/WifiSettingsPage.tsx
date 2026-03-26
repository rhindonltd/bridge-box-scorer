"use client";

import { useEffect, useState } from "react";

type Network = {
  ssid: string;
  signal: number;
  security: string;
};

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export default function WifiSettings() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedSSID, setSelectedSSID] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  // --- Load WiFi networks ---
  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      const res = await fetch("/api/system/wifi/scan");
      const data = await res.json();

      // Sort by signal strength
      data.sort((a: Network, b: Network) => b.signal - a.signal);

      setNetworks(data);
    } catch {
      setMessage("Failed to load WiFi networks");
    }
  };

  // --- Test connection ---
  const testConnection = async () => {
    if (!selectedSSID) {
      setMessage("Please select a network");
      return;
    }

    setTesting(true);
    setMessage("Testing connection...");

    try {
      const res = await fetch("/api/system/wifi/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          ssid: selectedSSID,
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✅ Connection successful");
      } else {
        setMessage("❌ Failed to connect");
      }
    } catch {
      setMessage("❌ Error testing connection");
    } finally {
      setTesting(false);
    }
  };

  // --- Save + restart ---
  const saveWifi = async () => {
    if (!selectedSSID || !password) {
      setMessage("Please select a network and enter password");
      return;
    }

    setLoading(true);
    setMessage("Saving WiFi settings...");

    try {
      await fetch("/api/system/wifi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          ssid: selectedSSID,
          password,
        }),
      });

      setMessage("Applying settings — restarting...");

      // Trigger restart
      await fetch("/api/system/restart", {
        method: "POST",
        headers: {
          "x-admin-key": ADMIN_KEY,
        },
      });

      // Redirect to reconnect screen (optional)
      window.location.href = "/restarting";
    } catch {
      setMessage("Failed to save WiFi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>WiFi Settings</h2>

      {/* Network dropdown */}
      <label>Network</label>
      <select
        value={selectedSSID}
        onChange={(e) => setSelectedSSID(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      >
        <option value="">-- Select WiFi --</option>
        {networks.map((n) => (
          <option key={n.ssid} value={n.ssid}>
            {n.ssid} ({n.signal}%)
          </option>
        ))}
      </select>

      {/* Password */}
      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter WiFi password"
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={testConnection}
          disabled={testing}
          style={{ flex: 1 }}
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>

        <button
          onClick={saveWifi}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? "Saving..." : "Save & Apply"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <p style={{ marginTop: 15 }}>
          {message}
        </p>
      )}
    </div>
  );
}
