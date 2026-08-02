import { describe, expect, it } from "vitest";

import {
  calculateBreakEven,
  compareNamedScenarios,
  simulateScenario,
} from "./scenario";

describe("break-even", () => {
  it("calculates units, revenue and daily/weekly/monthly targets", () => {
    const result = calculateBreakEven({
      fixedCosts: 1000,
      sellingPricePerUnit: 20,
      variableCostPerUnit: 8,
      percentageChargesRate: 0.1,
      operatingDaysPerMonth: 25,
      operatingWeeksPerMonth: 4,
    });
    expect(result.contributionPerUnit.toString()).toBe("10");
    expect(result.contributionMarginRatio.toString()).toBe("0.5");
    expect(result.breakEvenUnits.toString()).toBe("100");
    expect(result.breakEvenRevenue.toString()).toBe("2000");
    expect(result.weeklySalesTarget.toString()).toBe("500");
    expect(result.dailySalesTarget.toString()).toBe("80");
  });

  it("rejects zero or negative unit contribution", () => {
    expect(() =>
      calculateBreakEven({
        fixedCosts: 1000,
        sellingPricePerUnit: 10,
        variableCostPerUnit: 9,
        percentageChargesRate: 0.1,
      }),
    ).toThrow(/zero or negative/);
  });
});

describe("scenarios", () => {
  it("combines inflation, fixed cost, discount, price and volume sensitivity", () => {
    const result = simulateScenario({
      id: "stress",
      sellingPrice: 20,
      unitsSold: 100,
      ingredientCostPerUnit: 5,
      otherVariableCostPerUnit: 2,
      fixedCosts: 400,
      percentageChargesRate: 0.1,
      ingredientInflationRate: 0.2,
      fixedCostChangeRate: 0.1,
      sellingPriceChangeRate: 0.1,
      salesVolumeChangeRate: -0.1,
      discountRate: 0.1,
    });
    expect(result.sellingPrice.toString()).toBe("19.8");
    expect(result.unitsSold.toString()).toBe("90");
    expect(result.revenue.toString()).toBe("1782");
    expect(result.variableCosts.toString()).toBe("720");
    expect(result.percentageCharges.toString()).toBe("178.2");
    expect(result.fixedCosts.toString()).toBe("440");
    expect(result.netProfit.toString()).toBe("443.8");
  });

  it("returns all three named scenarios", () => {
    const base = {
      sellingPrice: 20,
      unitsSold: 100,
      ingredientCostPerUnit: 5,
      fixedCosts: 300,
    } as const;
    const results = compareNamedScenarios({
      conservative: { ...base, salesVolumeChangeRate: -0.2 },
      expected: base,
      optimistic: { ...base, salesVolumeChangeRate: 0.2 },
    });
    expect(results.conservative.unitsSold.toString()).toBe("80");
    expect(results.expected.unitsSold.toString()).toBe("100");
    expect(results.optimistic.unitsSold.toString()).toBe("120");
  });

  it("keeps loss-making scenarios visible and marks break-even as unavailable", () => {
    const result = simulateScenario({
      id: "loss",
      sellingPrice: 10,
      unitsSold: 20,
      ingredientCostPerUnit: 11,
      fixedCosts: 100,
    });
    expect(result.netProfit.toString()).toBe("-120");
    expect(result.breakEvenUnits).toBeNull();
    expect(result.breakEvenRevenue).toBeNull();
    expect(result.warnings).toEqual([
      "NON_POSITIVE_CONTRIBUTION",
      "NEGATIVE_NET_MARGIN",
    ]);
  });
});
