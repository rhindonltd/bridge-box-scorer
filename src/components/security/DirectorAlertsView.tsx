"use client";

import { Dialog } from "@headlessui/react";
import { BellRing, ShieldAlert } from "lucide-react";
import {
  alertTime,
  describeAlert,
  describeTable,
  type DirectorAlert,
} from "@/model/director-alert";

interface Props {
  alerts: DirectorAlert[];
  onDismiss: (id: string) => void;
}

function title(alerts: DirectorAlert[]): string {
  if (alerts.length > 1) return `Alerts (${alerts.length})`;
  return alerts[0]?.kind === "callDirector"
    ? "Director called"
    : "Security alert";
}

const CARD_STYLE: Record<DirectorAlert["kind"], string> = {
  callDirector: "border-blue-200 bg-blue-50",
  signedIn: "border-amber-200 bg-amber-50",
  repeatedFailures: "border-red-200 bg-red-50",
};

/**
 * The director alert popup: one card per alert, oldest first, each with its
 * own Dismiss. Calls from players lead with the table to go to; security
 * alerts with what happened. Stays open until every alert has been dismissed
 * (tapping outside does nothing), so a director can't miss one.
 */
export function DirectorAlertsView({ alerts, onDismiss }: Props) {
  const allCalls =
    alerts.length > 0 && alerts.every((a) => a.kind === "callDirector");
  const Icon = allCalls ? BellRing : ShieldAlert;
  return (
    <Dialog
      open={alerts.length > 0}
      // Only Dismiss closes an alert.
      onClose={() => {}}
      className="relative z-[60]"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          role="alertdialog"
          className="flex max-h-[85dvh] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl"
        >
          <Dialog.Title className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 text-lg font-semibold text-gray-900">
            <Icon
              className={`h-5 w-5 ${allCalls ? "text-blue-600" : "text-red-600"}`}
              aria-hidden="true"
            />
            {title(alerts)}
          </Dialog.Title>
          <ul className="flex flex-col gap-3 overflow-y-auto p-4">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                data-testid="director-alert"
                className={`rounded-xl border p-3 ${CARD_STYLE[alert.kind]}`}
              >
                <p className="text-xs font-medium text-gray-500">
                  {alertTime(alert.at)}
                </p>
                {alert.kind === "callDirector" && (
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    Go to {describeTable(alert.table)}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-900">
                  {describeAlert(alert)}
                </p>
                <button
                  type="button"
                  onClick={() => onDismiss(alert.id)}
                  className="mt-3 w-full rounded-lg bg-gray-200 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
