"use client";

import { useState, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";

export type Network = {
  ssid: string;
  signal: number;
};

export type WifiSettingsFormProps = {
  networks: Network[];
  onTestConnection?: (ssid: string, password: string) => Promise<boolean>; // returns success
  onSaveWifi?: (ssid: string, password: string) => void;
  testing?: boolean;
  loading?: boolean;
  message?: string | null;
};

export function WifiSettingsForm({
  networks,
  onTestConnection,
  onSaveWifi,
  testing = false,
  loading = false,
  message = null,
}: WifiSettingsFormProps) {
  const [selectedSSID, setSelectedSSID] = useState<Network | null>(null);
  const [password, setPassword] = useState("");
  const [testedSSID, setTestedSSID] = useState<string | null>(null); // Track successfully tested network

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
    if (!selectedSSID) return;
    if (!onTestConnection) return;

    const success = await onTestConnection(selectedSSID.ssid, password);
    if (success) {
      setTestedSSID(selectedSSID.ssid);
    } else {
      setTestedSSID(null);
    }
  };

  const handleSaveClick = () => {
    if (!selectedSSID || !onSaveWifi) return;
    onSaveWifi(selectedSSID.ssid, password);
  };

  const saveEnabled = selectedSSID?.ssid === testedSSID;

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-xl shadow-md font-sans">
      <h2 className="text-2xl font-bold mb-4">WiFi Settings</h2>

      {/* Custom dropdown */}
      <label className="block text-sm font-medium mb-1">Network</label>
      <Menu as="div" className="relative mb-4">
        <Menu.Button className="w-full p-2 border border-gray-300 rounded text-left focus:outline-none focus:ring-2 focus:ring-blue-500">
          {selectedSSID ? (
            <div className="flex justify-between items-center">
              <span>{selectedSSID.ssid}</span>
              {renderSignalBars(selectedSSID.signal)}
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
                    onClick={() => setSelectedSSID(network)}
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
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Saving..." : "Save & Apply"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
