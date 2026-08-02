import { describe, expect, it } from "vitest";

import {
  convertByFactor,
  convertQuantity,
  defineUnit,
  UNITS,
} from "./conversions";
import { CalculationError } from "./errors";

describe("unit conversions", () => {
  it("converts mass, volume and custom count units exactly", () => {
    expect(convertQuantity("1.25", UNITS.kilogram, UNITS.gram).toString()).toBe(
      "1250",
    );
    expect(
      convertQuantity("750", UNITS.milliliter, UNITS.liter).toString(),
    ).toBe("0.75");
    expect(convertQuantity(2, UNITS.dozen, UNITS.unit).toString()).toBe("24");

    const tray = defineUnit({
      code: "tray",
      dimension: "count",
      toBaseFactor: 30,
    });
    expect(convertQuantity(3, tray, UNITS.unit).toString()).toBe("90");
    expect(convertByFactor("1.5", 8).toString()).toBe("12");
  });

  it("uses density for mass/volume conversions", () => {
    expect(
      convertQuantity(1000, UNITS.gram, UNITS.liter, {
        densityGramsPerMilliliter: "0.8",
      }).toString(),
    ).toBe("1.25");
    expect(
      convertQuantity(1, UNITS.liter, UNITS.kilogram, {
        densityGramsPerMilliliter: "0.8",
      }).toString(),
    ).toBe("0.8");
  });

  it("rejects impossible conversions and invalid factors", () => {
    expect(() => convertQuantity(1, UNITS.kilogram, UNITS.liter)).toThrowError(
      expect.objectContaining<Partial<CalculationError>>({
        code: "MISSING_DENSITY",
      }),
    );
    expect(() => convertQuantity(1, UNITS.unit, UNITS.gram)).toThrow(
      /Cannot convert/,
    );
    expect(() => convertByFactor(1, 0)).toThrow(/greater than zero/);
  });
});
