export type CalculationErrorCode =
  | "INVALID_AMOUNT"
  | "INVALID_QUANTITY"
  | "INVALID_RATE"
  | "INVALID_YIELD"
  | "INCOMPATIBLE_UNITS"
  | "MISSING_DENSITY"
  | "IMPOSSIBLE_PERCENTAGES"
  | "NON_POSITIVE_CONTRIBUTION"
  | "CIRCULAR_RECIPE"
  | "DUPLICATE_RECIPE"
  | "INVALID_SCENARIO";

/** A predictable error that can safely be translated into a user-facing message. */
export class CalculationError extends Error {
  readonly code: CalculationErrorCode;
  readonly details?: Readonly<Record<string, string>>;

  constructor(
    code: CalculationErrorCode,
    message: string,
    details?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "CalculationError";
    this.code = code;
    this.details = details;
  }
}
