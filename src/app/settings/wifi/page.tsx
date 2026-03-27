"use client";

import { useEffect, useState } from "react";
import { Network } from "@/model/network"
import { WifiSettingsForm } from "@/components/pages/settings/WifiSettingsForm";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export default function WifiSettings() {
    const [networks, setNetworks] = useState<Network[]>([]);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchNetworks();
    }, []);

    const fetchNetworks = async () => {
        try {
            const res = await fetch("/api/system/wifi/scan");
            const data = await res.json();
            data.sort((a: Network, b: Network) => b.signal - a.signal);
            setNetworks(data);
        } catch {
            setMessage("Failed to load WiFi networks");
        }
    };

    const handleTest = async (ssid: string, password: string) => {
        setTesting(true);
        setMessage("Testing connection...");
        try {
            const res = await fetch("/api/system/wifi/test", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
                body: JSON.stringify({ ssid, password }),
            });
            const data = await res.json();
            setMessage(data.success ? "✅ Connection successful" : "❌ Failed to connect");
        } catch {
            setMessage("❌ Error testing connection");
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async (ssid: string, password: string) => {
        setLoading(true);
        setMessage("Saving WiFi settings...");
        try {
            await fetch("/api/system/wifi", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
                body: JSON.stringify({ ssid, password }),
            });
            await fetch("/api/system/restart", { method: "POST", headers: { "x-admin-key": ADMIN_KEY } });
            window.location.href = "/restarting";
        } catch {
            setMessage("Failed to save WiFi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <WifiSettingsForm
            networks={networks}
            testing={testing}
            loading={loading}
            message={message}
            onTestConnection={handleTest}
            onSaveWifi={handleSave}
        />
    );
}
