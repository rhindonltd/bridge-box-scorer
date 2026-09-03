import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  InitialSeatProvider,
  useInitialSeat,
} from "./InitialSeatContext";
import type { Seat } from "@/model/participants";

describe("InitialSeatContext", () => {
  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useInitialSeat())).toThrow(
      /must be used within InitialSeatProvider/,
    );
  });

  it("exposes the provided initial seat", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <InitialSeatProvider initialSeat={"A1NS" as Seat}>
        {children}
      </InitialSeatProvider>
    );

    const { result } = renderHook(() => useInitialSeat(), { wrapper });
    expect(result.current.initialSeat).toBe("A1NS");
  });

  it("supports a null initial seat", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <InitialSeatProvider initialSeat={null}>{children}</InitialSeatProvider>
    );

    const { result } = renderHook(() => useInitialSeat(), { wrapper });
    expect(result.current.initialSeat).toBeNull();
  });
});
