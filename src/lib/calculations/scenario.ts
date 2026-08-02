import Decimal from "decimal.js";

import {
  ONE,
  ZERO,
  decimal,
  nonNegative,
  positive,
  rate,
  type DecimalInput,
} from "./decimal";
import { CalculationError } from "./errors";

export interface BreakEvenInput {
  readonly fixedCosts: DecimalInput;
  readonly sellingPricePerUnit: DecimalInput;
  readonly variableCostPerUnit: DecimalInput;
  readonly percentageChargesRate?: DecimalInput;
  readonly operatingDaysPerMonth?: DecimalInput;
  readonly operatingWeeksPerMonth?: DecimalInput;
}

export interface BreakEvenResult {
  readonly contributionPerUnit: Decimal;
  readonly contributionMarginRatio: Decimal;
  readonly breakEvenUnits: Decimal;
  readonly breakEvenRevenue: Decimal;
  readonly monthlySalesTarget: Decimal;
  readonly weeklySalesTarget: Decimal;
  readonly dailySalesTarget: Decimal;
}

export interface ScenarioInput {
  readonly id: string;
  readonly sellingPrice: DecimalInput;
  readonly unitsSold: DecimalInput;
  readonly ingredientCostPerUnit: DecimalInput;
  readonly otherVariableCostPerUnit?: DecimalInput;
  readonly fixedCosts: DecimalInput;
  readonly percentageChargesRate?: DecimalInput;
  readonly ingredientInflationRate?: DecimalInput;
  readonly fixedCostChangeRate?: DecimalInput;
  readonly sellingPriceChangeRate?: DecimalInput;
  readonly salesVolumeChangeRate?: DecimalInput;
  readonly discountRate?: DecimalInput;
}

export interface ScenarioResult {
  readonly id: string;
  readonly sellingPrice: Decimal;
  readonly unitsSold: Decimal;
  readonly revenue: Decimal;
  readonly variableCosts: Decimal;
  readonly percentageCharges: Decimal;
  readonly fixedCosts: Decimal;
  readonly contributionProfit: Decimal;
  readonly contributionMargin: Decimal;
  readonly netProfit: Decimal;
  readonly netMargin: Decimal;
  readonly breakEvenUnits: Decimal | null;
  readonly breakEvenRevenue: Decimal | null;
  readonly warnings: readonly ScenarioWarning[];
}

export type ScenarioWarning =
  "NON_POSITIVE_CONTRIBUTION" | "NEGATIVE_NET_MARGIN";

export interface NamedScenariosInput {
  readonly conservative: Omit<ScenarioInput, "id">;
  readonly expected: Omit<ScenarioInput, "id">;
  readonly optimistic: Omit<ScenarioInput, "id">;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixedCosts = nonNegative(input.fixedCosts, "fixedCosts");
  const sellingPrice = positive(
    input.sellingPricePerUnit,
    "sellingPricePerUnit",
  );
  const variableCost = nonNegative(
    input.variableCostPerUnit,
    "variableCostPerUnit",
  );
  const percentageChargesRate = rate(
    input.percentageChargesRate ?? ZERO,
    "percentageChargesRate",
  );
  const contributionPerUnit = sellingPrice
    .times(ONE.minus(percentageChargesRate))
    .minus(variableCost);
  if (!contributionPerUnit.gt(0)) {
    throw new CalculationError(
      "NON_POSITIVE_CONTRIBUTION",
      "Break-even is undefined when contribution per unit is zero or negative.",
    );
  }
  const contributionMarginRatio = contributionPerUnit.div(sellingPrice);
  const breakEvenUnits = fixedCosts.div(contributionPerUnit);
  const breakEvenRevenue = fixedCosts.div(contributionMarginRatio);
  const days = positive(
    input.operatingDaysPerMonth ?? 30,
    "operatingDaysPerMonth",
  );
  const weeks = positive(
    input.operatingWeeksPerMonth ?? 4,
    "operatingWeeksPerMonth",
  );

  return {
    contributionPerUnit,
    contributionMarginRatio,
    breakEvenUnits,
    breakEvenRevenue,
    monthlySalesTarget: breakEvenRevenue,
    weeklySalesTarget: breakEvenRevenue.div(weeks),
    dailySalesTarget: breakEvenRevenue.div(days),
  };
}

export function simulateScenario(input: ScenarioInput): ScenarioResult {
  if (!input.id.trim())
    throw new CalculationError(
      "INVALID_SCENARIO",
      "Scenario id cannot be empty.",
    );
  const basePrice = positive(input.sellingPrice, "sellingPrice");
  const baseUnits = nonNegative(
    input.unitsSold,
    "unitsSold",
    "INVALID_QUANTITY",
  );
  const ingredientCost = nonNegative(
    input.ingredientCostPerUnit,
    "ingredientCostPerUnit",
  );
  const otherVariableCost = nonNegative(
    input.otherVariableCostPerUnit ?? ZERO,
    "otherVariableCostPerUnit",
  );
  const baseFixedCosts = nonNegative(input.fixedCosts, "fixedCosts");
  const chargesRate = rate(
    input.percentageChargesRate ?? ZERO,
    "percentageChargesRate",
  );
  const inflation = signedRate(
    input.ingredientInflationRate ?? ZERO,
    "ingredientInflationRate",
  );
  const fixedChange = signedRate(
    input.fixedCostChangeRate ?? ZERO,
    "fixedCostChangeRate",
  );
  const priceChange = signedRate(
    input.sellingPriceChangeRate ?? ZERO,
    "sellingPriceChangeRate",
  );
  const volumeChange = signedRate(
    input.salesVolumeChangeRate ?? ZERO,
    "salesVolumeChangeRate",
  );
  const discount = rate(input.discountRate ?? ZERO, "discountRate", false);

  const sellingPrice = basePrice
    .times(ONE.plus(priceChange))
    .times(ONE.minus(discount));
  const unitsSold = baseUnits.times(ONE.plus(volumeChange));
  const adjustedIngredientCost = ingredientCost.times(ONE.plus(inflation));
  const fixedCosts = baseFixedCosts.times(ONE.plus(fixedChange));
  ensureNonNegativeAdjusted(sellingPrice, "sellingPrice");
  ensureNonNegativeAdjusted(unitsSold, "unitsSold");
  ensureNonNegativeAdjusted(adjustedIngredientCost, "ingredientCostPerUnit");
  ensureNonNegativeAdjusted(fixedCosts, "fixedCosts");

  const revenue = sellingPrice.times(unitsSold);
  const variableCosts = adjustedIngredientCost
    .plus(otherVariableCost)
    .times(unitsSold);
  const percentageCharges = revenue.times(chargesRate);
  const contributionProfit = revenue
    .minus(variableCosts)
    .minus(percentageCharges);
  const netProfit = contributionProfit.minus(fixedCosts);
  const contributionMargin = revenue.isZero()
    ? ZERO
    : contributionProfit.div(revenue);
  const netMargin = revenue.isZero() ? ZERO : netProfit.div(revenue);
  const unitContribution = sellingPrice
    .times(ONE.minus(chargesRate))
    .minus(adjustedIngredientCost)
    .minus(otherVariableCost);
  const breakEven = unitContribution.gt(0)
    ? calculateBreakEven({
        fixedCosts,
        sellingPricePerUnit: sellingPrice,
        variableCostPerUnit: adjustedIngredientCost.plus(otherVariableCost),
        percentageChargesRate: chargesRate,
      })
    : null;
  const warnings: ScenarioWarning[] = [];
  if (breakEven === null) warnings.push("NON_POSITIVE_CONTRIBUTION");
  if (netProfit.isNegative()) warnings.push("NEGATIVE_NET_MARGIN");

  return {
    id: input.id,
    sellingPrice,
    unitsSold,
    revenue,
    variableCosts,
    percentageCharges,
    fixedCosts,
    contributionProfit,
    contributionMargin,
    netProfit,
    netMargin,
    breakEvenUnits: breakEven?.breakEvenUnits ?? null,
    breakEvenRevenue: breakEven?.breakEvenRevenue ?? null,
    warnings,
  };
}

export function compareNamedScenarios(
  input: NamedScenariosInput,
): Readonly<
  Record<"conservative" | "expected" | "optimistic", ScenarioResult>
> {
  return {
    conservative: simulateScenario({
      id: "conservative",
      ...input.conservative,
    }),
    expected: simulateScenario({ id: "expected", ...input.expected }),
    optimistic: simulateScenario({ id: "optimistic", ...input.optimistic }),
  };
}

function signedRate(value: DecimalInput, field: string): Decimal {
  const parsed = decimal(value, field);
  if (!parsed.isFinite() || parsed.lt(-1)) {
    throw new CalculationError(
      "INVALID_RATE",
      `${field} must be finite and no less than -1.`,
    );
  }
  return parsed;
}

function ensureNonNegativeAdjusted(value: Decimal, field: string): void {
  if (value.isNegative()) {
    throw new CalculationError(
      "INVALID_SCENARIO",
      `Adjusted ${field} cannot be negative.`,
    );
  }
}
