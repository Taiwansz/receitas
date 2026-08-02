import { describe, expect, it } from "vitest";

import { CalculationError } from "./errors";
import {
  calculateIngredientCost,
  calculateIngredientReferenceCosts,
} from "./ingredient";

describe("calculateIngredientCost", () => {
  it("includes discounts, freight, taxes and fees before applying edible yield", () => {
    const result = calculateIngredientCost({
      purchaseUnitPrice: "10",
      grossQuantity: "10",
      discounts: [{ type: "percentage", value: "0.10" }],
      freight: [{ type: "fixed", value: "5" }],
      taxes: [{ type: "percentage", value: "0.05" }],
      additionalFees: [{ type: "fixed", value: "2" }],
      yieldRate: "0.80",
      recipeUnitsPerPurchaseUnit: "1000",
    });

    expect(result.purchaseSubtotal.toString()).toBe("100");
    expect(result.acquisitionCost.toString()).toBe("102");
    expect(result.usableQuantity.toString()).toBe("8");
    expect(result.wasteQuantity.toString()).toBe("2");
    expect(result.ediblePortionCost.toString()).toBe("12.75");
    expect(result.costPerRecipeUnit.toString()).toBe("0.01275");
  });

  it("derives yield from waste and preserves decimal precision", () => {
    const result = calculateIngredientCost({
      purchaseUnitPrice: "0.1",
      grossQuantity: "3",
      wasteRate: "0.10",
    });

    expect(result.purchaseSubtotal.toString()).toBe("0.3");
    expect(result.usableQuantity.toString()).toBe("2.7");
    expect(result.ediblePortionCost.toSignificantDigits(20).toString()).toBe(
      "0.11111111111111111111",
    );
  });

  it("rejects ambiguous, zero-yield and excessive-discount inputs", () => {
    expect(() =>
      calculateIngredientCost({
        purchaseUnitPrice: 10,
        grossQuantity: 1,
        yieldRate: 0.8,
        wasteRate: 0.2,
      }),
    ).toThrowError(CalculationError);
    expect(() =>
      calculateIngredientCost({
        purchaseUnitPrice: 10,
        grossQuantity: 1,
        yieldRate: 0,
      }),
    ).toThrow(/yieldRate/);
    expect(() =>
      calculateIngredientCost({
        purchaseUnitPrice: 10,
        grossQuantity: 1,
        discounts: [{ type: "fixed", value: 11 }],
      }),
    ).toThrow(/Discounts/);
  });
});

describe("calculateIngredientReferenceCosts", () => {
  it("calculates latest, weighted-average and manual reference costs", () => {
    const result = calculateIngredientReferenceCosts({
      purchases: [
        { quantity: 10, totalAcquisitionCost: 100 },
        { quantity: 30, totalAcquisitionCost: 360 },
      ],
      manuallyDefinedReferenceCost: "11.75",
    });

    expect(result.latestPurchaseCost?.toString()).toBe("12");
    expect(result.weightedAverageCost?.toString()).toBe("11.5");
    expect(result.manuallyDefinedReferenceCost?.toString()).toBe("11.75");
  });

  it("returns null historical costs for an empty purchase history", () => {
    const result = calculateIngredientReferenceCosts({ purchases: [] });
    expect(result.latestPurchaseCost).toBeNull();
    expect(result.weightedAverageCost).toBeNull();
  });
});
