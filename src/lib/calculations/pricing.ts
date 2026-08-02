import Decimal from "decimal.js";

import {
  ONE,
  ZERO,
  nonNegative,
  positive,
  rate,
  sum,
  type DecimalInput,
} from "./decimal";
import { CalculationError } from "./errors";

export interface PercentageCharge {
  readonly id: string;
  /** Fraction of selling price; 0.10 means 10%. */
  readonly rate: DecimalInput;
}

export interface PricingInput {
  /** Product/recipe, packaging, labor, overhead and other monetary costs per sale. */
  readonly monetaryCosts: readonly DecimalInput[];
  /** Fixed transaction, channel or delivery charges per sale. */
  readonly fixedSaleCharges?: readonly DecimalInput[];
  readonly percentageCharges?: readonly PercentageCharge[];
  readonly targetMargin: DecimalInput;
}

export interface PricingResult {
  readonly monetaryCost: Decimal;
  readonly fixedSaleCharges: Decimal;
  readonly percentageChargeRate: Decimal;
  readonly targetMargin: Decimal;
  readonly markupDivisor: Decimal;
  readonly minimumPriceWithoutLoss: Decimal;
  readonly suggestedSellingPrice: Decimal;
  readonly markupMultiplier: Decimal | null;
  readonly markupRate: Decimal | null;
}

export interface ProfitabilityInput {
  readonly sellingPrice: DecimalInput;
  readonly productCost: DecimalInput;
  readonly variableMonetaryCosts?: readonly DecimalInput[];
  readonly fixedAllocatedCosts?: readonly DecimalInput[];
  readonly percentageCharges?: readonly PercentageCharge[];
}

export interface ProfitabilityResult {
  readonly sellingPrice: Decimal;
  readonly percentageChargeAmount: Decimal;
  readonly grossProfit: Decimal;
  readonly grossMargin: Decimal;
  readonly contributionProfit: Decimal;
  readonly contributionMargin: Decimal;
  readonly estimatedNetProfit: Decimal;
  readonly netMargin: Decimal;
  readonly markupMultiplier: Decimal | null;
  readonly markupRate: Decimal | null;
}

export interface DiscountLimitInput extends Omit<PricingInput, "targetMargin"> {
  readonly currentPrice: DecimalInput;
  readonly minimumMargin?: DecimalInput;
}

export interface DiscountLimitResult {
  readonly floorPrice: Decimal;
  readonly maximumDiscountAmount: Decimal;
  readonly maximumDiscountRate: Decimal;
}

export interface ChannelPricingInput extends PricingInput {
  readonly channelId: string;
}

export interface QuantityTierInput {
  readonly minimumQuantity: DecimalInput;
  readonly discountRate: DecimalInput;
}

export interface QuantityTierPrice {
  readonly minimumQuantity: Decimal;
  readonly discountRate: Decimal;
  readonly unitPrice: Decimal;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const monetaryCost = sumNonNegative(input.monetaryCosts, "monetaryCosts");
  const fixedSaleCharges = sumNonNegative(
    input.fixedSaleCharges ?? [],
    "fixedSaleCharges",
  );
  const percentageChargeRate = chargeRate(input.percentageCharges);
  const targetMargin = rate(input.targetMargin, "targetMargin");
  const markupDivisor = divisor(percentageChargeRate, targetMargin);
  const priceBase = monetaryCost.plus(fixedSaleCharges);
  const minimumDivisor = divisor(percentageChargeRate, ZERO);
  const suggestedSellingPrice = priceBase.div(markupDivisor);
  const { multiplier, markupRate } = markup(
    suggestedSellingPrice,
    monetaryCost,
  );

  return {
    monetaryCost,
    fixedSaleCharges,
    percentageChargeRate,
    targetMargin,
    markupDivisor,
    minimumPriceWithoutLoss: priceBase.div(minimumDivisor),
    suggestedSellingPrice,
    markupMultiplier: multiplier,
    markupRate,
  };
}

export function calculateProfitability(
  input: ProfitabilityInput,
): ProfitabilityResult {
  const sellingPrice = positive(input.sellingPrice, "sellingPrice");
  const productCost = nonNegative(input.productCost, "productCost");
  const variableCosts = sumNonNegative(
    input.variableMonetaryCosts ?? [],
    "variableMonetaryCosts",
  );
  const fixedCosts = sumNonNegative(
    input.fixedAllocatedCosts ?? [],
    "fixedAllocatedCosts",
  );
  const percentageChargeAmount = sellingPrice.times(
    chargeRate(input.percentageCharges),
  );
  const grossProfit = sellingPrice.minus(productCost);
  const contributionProfit = grossProfit
    .minus(variableCosts)
    .minus(percentageChargeAmount);
  const estimatedNetProfit = contributionProfit.minus(fixedCosts);
  const { multiplier, markupRate } = markup(sellingPrice, productCost);

  return {
    sellingPrice,
    percentageChargeAmount,
    grossProfit,
    grossMargin: grossProfit.div(sellingPrice),
    contributionProfit,
    contributionMargin: contributionProfit.div(sellingPrice),
    estimatedNetProfit,
    netMargin: estimatedNetProfit.div(sellingPrice),
    markupMultiplier: multiplier,
    markupRate,
  };
}

export function calculateDiscountLimit(
  input: DiscountLimitInput,
): DiscountLimitResult {
  const currentPrice = positive(input.currentPrice, "currentPrice");
  const floorPrice = calculatePricing({
    ...input,
    targetMargin: input.minimumMargin ?? ZERO,
  }).suggestedSellingPrice;
  if (currentPrice.lt(floorPrice)) {
    return {
      floorPrice,
      maximumDiscountAmount: ZERO,
      maximumDiscountRate: ZERO,
    };
  }
  const maximumDiscountAmount = currentPrice.minus(floorPrice);
  return {
    floorPrice,
    maximumDiscountAmount,
    maximumDiscountRate: maximumDiscountAmount.div(currentPrice),
  };
}

export function calculateChannelPrices(
  channels: readonly ChannelPricingInput[],
): Readonly<Record<string, PricingResult>> {
  const result = Object.create(null) as Record<string, PricingResult>;
  for (const channel of channels) {
    if (!channel.channelId.trim() || Object.hasOwn(result, channel.channelId)) {
      throw new CalculationError(
        "INVALID_SCENARIO",
        `Invalid or duplicate channel: ${channel.channelId}`,
      );
    }
    result[channel.channelId] = calculatePricing(channel);
  }
  return result;
}

export function calculateQuantityTierPrices(
  basePrice: DecimalInput,
  tiers: readonly QuantityTierInput[],
): readonly QuantityTierPrice[] {
  const price = positive(basePrice, "basePrice");
  let previousQuantity = ZERO;
  return tiers.map((tier, index) => {
    const minimumQuantity = positive(
      tier.minimumQuantity,
      `tiers[${index}].minimumQuantity`,
    );
    if (minimumQuantity.lte(previousQuantity)) {
      throw new CalculationError(
        "INVALID_SCENARIO",
        "Quantity tiers must be strictly increasing.",
      );
    }
    previousQuantity = minimumQuantity;
    const discountRate = rate(
      tier.discountRate,
      `tiers[${index}].discountRate`,
      false,
    );
    return {
      minimumQuantity,
      discountRate,
      unitPrice: price.times(ONE.minus(discountRate)),
    };
  });
}

function chargeRate(charges: readonly PercentageCharge[] | undefined): Decimal {
  return sum(
    (charges ?? []).map((charge, index) =>
      rate(charge.rate, `charges[${index}].rate`),
    ),
  );
}

function divisor(charges: Decimal, margin: Decimal): Decimal {
  const result = ONE.minus(charges).minus(margin);
  if (!result.gt(0)) {
    throw new CalculationError(
      "IMPOSSIBLE_PERCENTAGES",
      "Percentage charges plus target margin must be less than 100%.",
      { total: charges.plus(margin).toString() },
    );
  }
  return result;
}

function sumNonNegative(
  values: readonly DecimalInput[],
  field: string,
): Decimal {
  return sum(
    values.map((value, index) => nonNegative(value, `${field}[${index}]`)),
  );
}

function markup(
  sellingPrice: Decimal,
  cost: Decimal,
): { multiplier: Decimal | null; markupRate: Decimal | null } {
  if (cost.isZero()) return { multiplier: null, markupRate: null };
  return {
    multiplier: sellingPrice.div(cost),
    markupRate: sellingPrice.minus(cost).div(cost),
  };
}
