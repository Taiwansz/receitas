import Decimal from "decimal.js";

import { decimal, positive, type DecimalInput } from "./decimal";
import { CalculationError } from "./errors";

export type UnitDimension = "mass" | "volume" | "count";

export interface UnitDefinition {
  readonly code: string;
  readonly dimension: UnitDimension;
  /** Number of base units represented by one unit (g, ml or unit). */
  readonly toBaseFactor: DecimalInput;
}

export interface ConversionOptions {
  /** Required only for mass-to-volume conversions; expressed in g/ml. */
  readonly densityGramsPerMilliliter?: DecimalInput;
}

export const UNITS = {
  milligram: { code: "mg", dimension: "mass", toBaseFactor: "0.001" },
  gram: { code: "g", dimension: "mass", toBaseFactor: "1" },
  kilogram: { code: "kg", dimension: "mass", toBaseFactor: "1000" },
  milliliter: { code: "ml", dimension: "volume", toBaseFactor: "1" },
  liter: { code: "l", dimension: "volume", toBaseFactor: "1000" },
  unit: { code: "un", dimension: "count", toBaseFactor: "1" },
  dozen: { code: "dz", dimension: "count", toBaseFactor: "12" },
} as const satisfies Record<string, UnitDefinition>;

export function defineUnit(unit: UnitDefinition): UnitDefinition {
  if (!unit.code.trim()) {
    throw new CalculationError(
      "INCOMPATIBLE_UNITS",
      "Unit code cannot be empty.",
    );
  }
  positive(unit.toBaseFactor, `${unit.code}.toBaseFactor`);
  return Object.freeze({ ...unit });
}

export function convertQuantity(
  quantity: DecimalInput,
  from: UnitDefinition,
  to: UnitDefinition,
  options: ConversionOptions = {},
): Decimal {
  const value = nonNegativeQuantity(quantity, "quantity");
  const fromFactor = positive(from.toBaseFactor, `${from.code}.toBaseFactor`);
  const toFactor = positive(to.toBaseFactor, `${to.code}.toBaseFactor`);

  if (from.dimension === to.dimension) {
    return value.times(fromFactor).div(toFactor);
  }

  const crossesMassAndVolume =
    (from.dimension === "mass" && to.dimension === "volume") ||
    (from.dimension === "volume" && to.dimension === "mass");
  if (!crossesMassAndVolume) {
    throw new CalculationError(
      "INCOMPATIBLE_UNITS",
      `Cannot convert ${from.code} (${from.dimension}) to ${to.code} (${to.dimension}).`,
      { from: from.code, to: to.code },
    );
  }
  if (options.densityGramsPerMilliliter === undefined) {
    throw new CalculationError(
      "MISSING_DENSITY",
      "A density in grams per milliliter is required for mass/volume conversion.",
      { from: from.code, to: to.code },
    );
  }

  const density = positive(
    options.densityGramsPerMilliliter,
    "densityGramsPerMilliliter",
  );
  const sourceInBase = value.times(fromFactor);
  const targetInBase =
    from.dimension === "mass"
      ? sourceInBase.div(density)
      : sourceInBase.times(density);
  return targetInBase.div(toFactor);
}

/** Convert with an explicit factor expressed as target units per source unit. */
export function convertByFactor(
  quantity: DecimalInput,
  targetUnitsPerSourceUnit: DecimalInput,
): Decimal {
  return nonNegativeQuantity(quantity, "quantity").times(
    positive(targetUnitsPerSourceUnit, "targetUnitsPerSourceUnit"),
  );
}

function nonNegativeQuantity(value: DecimalInput, field: string): Decimal {
  const parsed = decimal(value, field);
  if (parsed.isNegative()) {
    throw new CalculationError(
      "INVALID_QUANTITY",
      `${field} cannot be negative.`,
      { field },
    );
  }
  return parsed;
}
