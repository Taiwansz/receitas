import Decimal from "decimal.js";

import {
  ONE,
  nonNegative,
  positive,
  rate,
  sum,
  type DecimalInput,
} from "./decimal";
import { CalculationError } from "./errors";

export interface FixedAdjustment {
  readonly type: "fixed";
  readonly value: DecimalInput;
  readonly label?: string;
}

export interface PercentageAdjustment {
  readonly type: "percentage";
  /** Fraction of the purchase subtotal; 0.10 means 10%. */
  readonly value: DecimalInput;
  readonly label?: string;
}

export type PurchaseAdjustment = FixedAdjustment | PercentageAdjustment;

export interface IngredientCostInput {
  readonly purchaseUnitPrice: DecimalInput;
  readonly grossQuantity: DecimalInput;
  readonly discounts?: readonly PurchaseAdjustment[];
  readonly freight?: readonly PurchaseAdjustment[];
  readonly taxes?: readonly PurchaseAdjustment[];
  readonly additionalFees?: readonly PurchaseAdjustment[];
  /** Use either yieldRate or wasteRate. If omitted, yield is 100%. */
  readonly yieldRate?: DecimalInput;
  readonly wasteRate?: DecimalInput;
  /** Number of recipe units contained in one gross purchase unit. */
  readonly recipeUnitsPerPurchaseUnit?: DecimalInput;
}

export interface IngredientCostResult {
  readonly purchaseSubtotal: Decimal;
  readonly discountAmount: Decimal;
  readonly freightAmount: Decimal;
  readonly taxAmount: Decimal;
  readonly additionalFeeAmount: Decimal;
  readonly acquisitionCost: Decimal;
  readonly grossQuantity: Decimal;
  readonly usableQuantity: Decimal;
  readonly wasteQuantity: Decimal;
  readonly effectiveYieldRate: Decimal;
  readonly costPerGrossPurchaseUnit: Decimal;
  readonly ediblePortionCost: Decimal;
  readonly costPerRecipeUnit: Decimal;
}

export interface HistoricalCost {
  readonly quantity: DecimalInput;
  readonly totalAcquisitionCost: DecimalInput;
}

export interface IngredientReferenceCostsInput {
  readonly purchases: readonly HistoricalCost[];
  readonly manuallyDefinedReferenceCost?: DecimalInput;
}

export interface IngredientReferenceCostsResult {
  readonly latestPurchaseCost: Decimal | null;
  readonly weightedAverageCost: Decimal | null;
  readonly manuallyDefinedReferenceCost: Decimal | null;
}

export function calculateIngredientCost(
  input: IngredientCostInput,
): IngredientCostResult {
  const unitPrice = nonNegative(input.purchaseUnitPrice, "purchaseUnitPrice");
  const grossQuantity = positive(input.grossQuantity, "grossQuantity");
  const purchaseSubtotal = unitPrice.times(grossQuantity);
  const discountAmount = adjustmentTotal(
    input.discounts,
    purchaseSubtotal,
    "discounts",
  );
  const freightAmount = adjustmentTotal(
    input.freight,
    purchaseSubtotal,
    "freight",
  );
  const taxAmount = adjustmentTotal(input.taxes, purchaseSubtotal, "taxes");
  const additionalFeeAmount = adjustmentTotal(
    input.additionalFees,
    purchaseSubtotal,
    "additionalFees",
  );
  const acquisitionCost = purchaseSubtotal
    .minus(discountAmount)
    .plus(freightAmount)
    .plus(taxAmount)
    .plus(additionalFeeAmount);

  if (discountAmount.gt(purchaseSubtotal)) {
    throw new CalculationError(
      "INVALID_AMOUNT",
      "Discounts cannot exceed the purchase subtotal.",
    );
  }
  if (acquisitionCost.isNegative()) {
    throw new CalculationError(
      "INVALID_AMOUNT",
      "Acquisition cost cannot be negative.",
    );
  }

  const effectiveYieldRate = resolveYield(input.yieldRate, input.wasteRate);
  const usableQuantity = grossQuantity.times(effectiveYieldRate);
  if (!usableQuantity.gt(0)) {
    throw new CalculationError(
      "INVALID_YIELD",
      "Usable quantity must be greater than zero.",
    );
  }
  const recipeUnitsPerPurchaseUnit = positive(
    input.recipeUnitsPerPurchaseUnit ?? ONE,
    "recipeUnitsPerPurchaseUnit",
  );
  const costPerGrossPurchaseUnit = acquisitionCost.div(grossQuantity);
  const ediblePortionCost = acquisitionCost.div(usableQuantity);

  return {
    purchaseSubtotal,
    discountAmount,
    freightAmount,
    taxAmount,
    additionalFeeAmount,
    acquisitionCost,
    grossQuantity,
    usableQuantity,
    wasteQuantity: grossQuantity.minus(usableQuantity),
    effectiveYieldRate,
    costPerGrossPurchaseUnit,
    ediblePortionCost,
    costPerRecipeUnit: ediblePortionCost.div(recipeUnitsPerPurchaseUnit),
  };
}

export function calculateIngredientReferenceCosts(
  input: IngredientReferenceCostsInput,
): IngredientReferenceCostsResult {
  const purchases = input.purchases.map((purchase, index) => {
    const quantity = positive(
      purchase.quantity,
      `purchases[${index}].quantity`,
    );
    const total = nonNegative(
      purchase.totalAcquisitionCost,
      `purchases[${index}].totalAcquisitionCost`,
    );
    return { quantity, total, unitCost: total.div(quantity) };
  });
  const totalQuantity = sum(purchases.map(({ quantity }) => quantity));
  const totalCost = sum(purchases.map(({ total }) => total));

  return {
    latestPurchaseCost: purchases.at(-1)?.unitCost ?? null,
    weightedAverageCost: totalQuantity.gt(0)
      ? totalCost.div(totalQuantity)
      : null,
    manuallyDefinedReferenceCost:
      input.manuallyDefinedReferenceCost === undefined
        ? null
        : nonNegative(
            input.manuallyDefinedReferenceCost,
            "manuallyDefinedReferenceCost",
          ),
  };
}

function adjustmentTotal(
  adjustments: readonly PurchaseAdjustment[] | undefined,
  base: Decimal,
  field: string,
): Decimal {
  return sum(
    (adjustments ?? []).map((adjustment, index) => {
      if (adjustment.type === "fixed") {
        return nonNegative(adjustment.value, `${field}[${index}].value`);
      }
      return base.times(rate(adjustment.value, `${field}[${index}].value`));
    }),
  );
}

function resolveYield(
  yieldValue?: DecimalInput,
  wasteValue?: DecimalInput,
): Decimal {
  if (yieldValue !== undefined && wasteValue !== undefined) {
    throw new CalculationError(
      "INVALID_YIELD",
      "Provide yieldRate or wasteRate, not both.",
    );
  }
  if (yieldValue !== undefined) {
    const parsed = rate(yieldValue, "yieldRate");
    if (!parsed.gt(0)) {
      throw new CalculationError(
        "INVALID_YIELD",
        "yieldRate must be greater than zero.",
      );
    }
    return parsed;
  }
  if (wasteValue !== undefined)
    return ONE.minus(rate(wasteValue, "wasteRate", false));
  return ONE;
}
