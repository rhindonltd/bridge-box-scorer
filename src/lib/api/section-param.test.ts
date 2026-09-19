import { describe, it, expect } from "vitest";

import { sectionFromUrl } from "./section-param";

describe("sectionFromUrl", () => {
  it("extracts the section segment for the section itself", () => {
    expect(sectionFromUrl("https://box.local/api/games/g1/sections/A")).toBe(
      "A",
    );
  });

  it("extracts the section for a sub-resource", () => {
    expect(
      sectionFromUrl("https://box.local/api/games/g1/sections/A/movement"),
    ).toBe("A");
    expect(
      sectionFromUrl("https://box.local/api/games/g1/sections/A/tables"),
    ).toBe("A");
  });

  it("url-decodes the section segment", () => {
    expect(
      sectionFromUrl("https://box.local/api/games/g1/sections/N%20S"),
    ).toBe("N S");
  });

  it("returns null when there is no sections segment", () => {
    expect(sectionFromUrl("https://box.local/api/games/g1/participants")).toBe(
      null,
    );
  });

  it("returns null when sections is the trailing segment with nothing after", () => {
    expect(sectionFromUrl("https://box.local/api/games/g1/sections")).toBe(
      null,
    );
  });
});
