import { describe, expect, it } from "vitest";

import {
  calculateChannelPrices,
  calculateDiscountLimit,
  calculatePricing,
  calculateProfitability,
  calculateQuantityTierPrices,
} from "./pricing";

describe("divisor-based pricing", () => {
  it("calculates minimum and target prices without confusing markup and margin", () => {
    const result = calculatePricing({
      monetaryCosts: [60],
      fixedSaleCharges: [5],
      percentageCharges: [{ id: "tax", rate: "0.10" }],
      targetMargin: "0.25",
    });

    expect(result.markupDivisor.toString()).toBe("0.65");
    expect(result.suggestedSellingPrice.toString()).toBe("100");
    expect(
      result.minimumPriceWithoutLoss.toSignificantDigits(20).toString(),
    ).toBe("72.222222222222222222");
    expect(result.markupMultiplier?.toSignificantDigits(20).toString()).toBe(
      "1.6666666666666666667",
    );
    expect(result.markupRate?.toSignificantDigits(20).toString()).toBe(
      "0.66666666666666666667",
    );
  });

  it("rejects percentages whose total is 100% or more", () => {
    expect(() =>
      calculatePricing({
        monetaryCosts: [10],
        percentageCharges: [{ id: "marketplace", rate: "0.7" }],
        targetMargin: "0.3",
      }),
    ).toThrow(/less than 100%/);
  });
});

describe("profit, channel, discount and tiers", () => {
  it("calculates gross, contribution and net margins independently", () => {
    const result = calculateProfitability({
      sellingPrice: 100,
      productCost: 60,
      variableMonetaryCosts: [5],
      fixedAllocatedCosts: [5],
      percentageCharges: [{ id: "tax", rate: "0.10" }],
    });
    expect(result.grossProfit.toString()).toBe("40");
    expect(result.grossMargin.toString()).toBe("0.4");
    expect(result.contributionProfit.toString()).toBe("25");
    expect(result.contributionMargin.toString()).toBe("0.25");
    expect(result.estimatedNetProfit.toString()).toBe("20");
    expect(result.netMargin.toString()).toBe("0.2");
  });

  it("finds a discount floor and protects an already-underpriced item", () => {
    const normal = calculateDiscountLimit({
      currentPrice: 100,
      monetaryCosts: [60],
      percentageCharges: [{ id: "tax", rate: 0.1 }],
      minimumMargin: 0.2,
    });
    expect(normal.floorPrice.toSignificantDigits(20).toString()).toBe(
      "85.714285714285714286",
    );
    expect(normal.maximumDiscountRate.toSignificantDigits(20).toString()).toBe(
      "0.14285714285714285714",
    );

    const underpriced = calculateDiscountLimit({
      currentPrice: 50,
      monetaryCosts: [60],
      minimumMargin: 0,
    });
    expect(underpriced.maximumDiscountRate.toString()).toBe("0");
  });

  it("prices channels independently and validates wholesale tiers", () => {
    const channels = calculateChannelPrices([
      { channelId: "store", monetaryCosts: [50], targetMargin: 0.2 },
      {
        channelId: "marketplace",
        monetaryCosts: [50],
        percentageCharges: [{ id: "commission", rate: 0.2 }],
        targetMargin: 0.2,
      },
    ]);
    expect(channels.store.suggestedSellingPrice.toString()).toBe("62.5");
    expect(
      channels.marketplace.suggestedSellingPrice
        .toSignificantDigits(20)
        .toString(),
    ).toBe("83.333333333333333333");

    const tiers = calculateQuantityTierPrices(100, [
      { minimumQuantity: 10, discountRate: 0.05 },
      { minimumQuantity: 50, discountRate: 0.1 },
    ]);
    expect(tiers.map((tier) => tier.unitPrice.toString())).toEqual([
      "95",
      "90",
    ]);
    expect(() =>
      calculateQuantityTierPrices(100, [
        { minimumQuantity: 10, discountRate: 0.05 },
        { minimumQuantity: 10, discountRate: 0.1 },
      ]),
    ).toThrow(/strictly increasing/);
  });
});
