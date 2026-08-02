import Decimal from "decimal.js";

import { CalculationError, type CalculationErrorCode } from "./errors";

export type DecimalInput = Decimal.Value;

// One shared, explicit precision policy for all calculations in this module tree.
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
});

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function decimal(value: DecimalInput, field = "value"): Decimal {
  let parsed: Decimal;
  try {
    parsed = new Decimal(value);
  } catch {
    throw new CalculationError(
      "INVALID_AMOUNT",
      `${field} must be a valid decimal.`,
      {
        field,
      },
    );
  }

  if (!parsed.isFinite()) {
    throw new CalculationError("INVALID_AMOUNT", `${field} must be finite.`, {
      field,
    });
  }
  return parsed;
}

export function nonNegative(
  value: DecimalInput,
  field: string,
  code: CalculationErrorCode = "INVALID_AMOUNT",
): Decimal {
  const parsed = decimal(value, field);
  if (parsed.isNegative()) {
    throw new CalculationError(code, `${field} cannot be negative.`, { field });
  }
  return parsed;
}

export function positive(
  value: DecimalInput,
  field: string,
  code: CalculationErrorCode = "INVALID_QUANTITY",
): Decimal {
  const parsed = decimal(value, field);
  if (!parsed.gt(ZERO)) {
    throw new CalculationError(code, `${field} must be greater than zero.`, {
      field,
    });
  }
  return parsed;
}

export function rate(
  value: DecimalInput,
  field: string,
  allowOne = true,
): Decimal {
  const parsed = decimal(value, field);
  const aboveMaximum = allowOne ? parsed.gt(ONE) : parsed.gte(ONE);
  if (parsed.isNegative() || aboveMaximum) {
    throw new CalculationError(
      "INVALID_RATE",
      `${field} must be between 0 and ${allowOne ? "1" : "less than 1"}.`,
      { field },
    );
  }
  return parsed;
}

export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), ZERO);
}

/** Round only at an explicit boundary (for example, BRL display or a database write). */
export function roundDecimal(
  value: DecimalInput,
  decimalPlaces = 2,
  mode: Decimal.Rounding = Decimal.ROUND_HALF_UP,
): Decimal {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new CalculationError(
      "INVALID_QUANTITY",
      "decimalPlaces must be a non-negative integer.",
    );
  }
  return decimal(value).toDecimalPlaces(decimalPlaces, mode);
}
