"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Check, Menu as MenuIcon } from "lucide-react";

/** A single entry in a {@link HeaderMenu} dropdown. */
export type HeaderMenuItem = {
  /** Text shown for the entry. */
  label: string;
  /** Invoked when the entry is chosen. */
  onSelect: () => void;
  /** When true, the entry is highlighted as the current selection. */
  active?: boolean;
};

type Props = {
  /** Entries to render in the dropdown, in display order. */
  items: HeaderMenuItem[];
  /** Accessible name for the hamburger trigger button. Defaults to "Menu". */
  label?: string;
};

/**
 * A reusable header hamburger menu: a single icon button that opens a dropdown
 * of {@link HeaderMenuItem}s. Designed to sit in a page header's right-hand
 * slot (e.g. `GamePageLayout`'s `headerRight`). Item selection and active state
 * are fully caller-driven, so this stays generic across pages.
 */
export function HeaderMenu({ items, label = "Menu" }: Props) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        aria-label={label}
        className="p-2 -mr-2 rounded-lg text-gray-800 hover:bg-gray-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <MenuIcon size={22} />
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
        <Menu.Items className="absolute right-0 z-20 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden focus:outline-none">
          {items.map((item) => (
            <Menu.Item key={item.label}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={item.onSelect}
                  aria-current={item.active ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${
                    active ? "bg-blue-50" : ""
                  } ${
                    item.active
                      ? "font-semibold text-blue-700"
                      : "font-medium text-gray-700"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.active && <Check size={16} aria-hidden="true" />}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
