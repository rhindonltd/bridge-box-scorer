import { describe, it, expect } from "vitest";
import { generateMitchell } from "@/movement/mitchell";
import { validateMitchell } from "@/movement/validateMitchell";

describe("Parameterized Mitchell Movements (3–15 tables)", () => {
  for (let tables = 3; tables <= 15; tables++) {
    const rounds = tables;
    const boardsPerRound = Math.ceil(21 / tables);

    const skip = tables % 2 === 0; // only even tables can have skip
    const arrowSwitchRounds = Math.floor(tables / 4); // test arrow switch in some rounds

    // 1️⃣ Standard Mitchell
    it(`validates standard Mitchell for ${tables} tables`, () => {
      const movement = generateMitchell({ tables, rounds, boardsPerRound });
      expect(() =>
        validateMitchell(movement, { tables, rounds, boardsPerRound }),
      ).not.toThrow();
    });

    // 2️⃣ Skip Mitchell (even tables only)
    if (skip) {
      it(`validates skip Mitchell for ${tables} tables`, () => {
        const movement = generateMitchell({
          tables,
          rounds,
          boardsPerRound,
          skip: true,
        });
        expect(() =>
          validateMitchell(movement, {
            tables,
            rounds,
            boardsPerRound,
            skip: true,
          }),
        ).not.toThrow();
      });
    }

    // 3️⃣ Arrow-switch Mitchell
    if (arrowSwitchRounds > 0) {
      it(`validates arrow-switch Mitchell for ${tables} tables`, () => {
        const movement = generateMitchell({
          tables,
          rounds,
          boardsPerRound,
          arrowSwitchRounds,
        });
        expect(() =>
          validateMitchell(movement, {
            tables,
            rounds,
            boardsPerRound,
            arrowSwitchRounds,
          }),
        ).not.toThrow();
      });
    }

    // 4️⃣ Combined skip + arrow-switch (only even tables)
    if (skip && arrowSwitchRounds > 0) {
      it(`validates skip + arrow-switch Mitchell for ${tables} tables`, () => {
        const movement = generateMitchell({
          tables,
          rounds,
          boardsPerRound,
          skip: true,
          arrowSwitchRounds,
        });
        expect(() =>
          validateMitchell(movement, {
            tables,
            rounds,
            boardsPerRound,
            skip: true,
            arrowSwitchRounds,
          }),
        ).not.toThrow();
      });
    }
  }
});
