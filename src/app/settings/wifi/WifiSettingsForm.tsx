"use client";

import { useState, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { PageLayout } from "@/components/layout/PageLayout";

export type Network = {
  ssid: string;
  signal: number;
};

export type Props = {
  networks: Network[];
  onTestConnection?: (ssid: string, password: string) => Promise<boolean>; // returns success
  onSaveWifi?: (ssid: string, password: string) => void;
  /** Trigger a rescan for nearby networks. */
  onScan?: () => void;
  /** Whether the first (automatic) scan has completed (drives the empty state). */
  hasScanned?: boolean;
  testing?: boolean;
  loading?: boolean;
  scanning?: boolean;
  message?: string | null;
};

export function WifiSettingsForm({
  networks,
  onTestConnection,
  onSaveWifi,
  onScan,
  hasScanned = false,
  testing = false,
  loading = false,
  scanning = false,
  message = null,
}: Props) {
  // Track selection by SSID string, not the Network object. A rescan replaces
  // `networks` with fresh object instances, so holding the object would leave
  // the selection stale (and appear cleared) after every background scan.
  const [selectedSSID, setSelectedSSID] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [testedSSID, setTestedSSID] = useState<string | null>(null); // Track successfully tested network

  // Resolve the currently-selected network from the live list so signal bars
  // stay in sync across rescans. Falls back to a bare SSID entry if the network
  // is no longer in range, so the selection (and password) survive a rescan.
  const selectedNetwork =
    networks.find((n) => n.ssid === selectedSSID) ??
    (selectedSSID ? { ssid: selectedSSID, signal: 0 } : null);

  const renderSignalBars = (signal: number) => {
    const bars = [25, 50, 75, 100].map((threshold, i) => (
      <span
        key={i}
        className={`inline-block w-1 h-3 mr-0.5 rounded-sm ${
          signal >= threshold ? "bg-blue-500" : "bg-gray-300"
        }`}
      />
    ));
    return <div className="inline-flex ml-2">{bars}</div>;
  };

  const handleTestClick = async () => {
    /* v8 ignore next -- defensive guard: the Test button is disabled without a selected network, so this is unreachable via the UI */
    if (!selectedSSID) return;
    if (!onTestConnection) return;

    const success = await onTestConnection(selectedSSID, password);
    if (success) {
      setTestedSSID(selectedSSID);
    } else {
      // A failed test only clears the "verified" marker (so Save stays
      // disabled). The chosen network and password are intentionally kept so
      // the director can correct the password and retry without re-selecting.
      setTestedSSID(null);
    }
  };

  const handleSaveClick = () => {
    if (!selectedSSID || !onSaveWifi) return;
    onSaveWifi(selectedSSID, password);
  };

  const saveEnabled = selectedSSID !== null && selectedSSID === testedSSID;

  return (
    <PageLayout headerTitle="Wifi Settings">
      <>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Network</label>
          <button
            type="button"
            onClick={() => onScan?.()}
            disabled={scanning || testing}
            data-testid="wifi-scan-button"
            className={`text-sm font-medium ${
              scanning || testing
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:text-blue-700"
            }`}
          >
            {scanning ? "Scanning…" : "Rescan"}
          </button>
        </div>

        {scanning && !hasScanned && (
          <p
            className="mb-2 text-sm text-gray-600"
            data-testid="wifi-scanning-hint"
          >
            Scanning for networks…
          </p>
        )}

        {!scanning && hasScanned && networks.length === 0 && (
          <p
            className="mb-2 text-sm text-gray-600"
            data-testid="wifi-no-networks"
          >
            No networks found. Tap “Rescan” to search again.
          </p>
        )}

        <Menu as="div" className="relative mb-4">
          <Menu.Button className="w-full p-2 border border-gray-300 rounded text-left focus:outline-none focus:ring-2 focus:ring-blue-500">
            {selectedNetwork ? (
              <div className="flex justify-between items-center">
                <span>{selectedNetwork.ssid}</span>
                {renderSignalBars(selectedNetwork.signal)}
              </div>
            ) : (
              "-- Select WiFi --"
            )}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
              {networks.map((network) => (
                <Menu.Item key={network.ssid}>
                  {({ active }) => (
                    <div
                      onClick={() => setSelectedSSID(network.ssid)}
                      className={`flex justify-between items-center px-4 py-2 cursor-pointer ${
                        active ? "bg-blue-100" : ""
                      }`}
                    >
                      <span>{network.ssid}</span>
                      {renderSignalBars(network.signal)}
                    </div>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Password */}
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter WiFi password"
          className="w-full p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleTestClick}
            disabled={testing || !selectedSSID}
            className={`flex-1 px-4 py-2 font-medium text-white rounded ${
              testing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>

          <button
            onClick={handleSaveClick}
            disabled={!saveEnabled || loading}
            className={`flex-1 px-4 py-2 font-medium text-white rounded ${
              !saveEnabled || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {loading ? "Saving..." : "Save & Apply"}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </>
    </PageLayout>
  );
}
