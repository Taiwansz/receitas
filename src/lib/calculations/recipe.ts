import Decimal from "decimal.js";

import { nonNegative, positive, sum, type DecimalInput } from "./decimal";
import { CalculationError } from "./errors";
import { convertQuantity, type UnitDefinition } from "./conversions";

export type RecipeCostCategory =
  | "ingredient"
  | "sub_recipe"
  | "packaging"
  | "direct_labor"
  | "direct_variable"
  | "allocated_indirect";

export interface RecipeCostItem {
  readonly id: string;
  readonly category: RecipeCostCategory;
  readonly quantity: DecimalInput;
  readonly costPerUnit: DecimalInput;
}

export interface RecipeCostInput {
  readonly items: readonly RecipeCostItem[];
  /** Planned usable output from this batch. */
  readonly theoreticalOutputQuantity: DecimalInput;
  /** Measured usable output; when omitted the theoretical output is used. */
  readonly actualOutputQuantity?: DecimalInput;
  readonly grossOutputQuantity?: DecimalInput;
  readonly portions?: DecimalInput;
  readonly outputUnit?: UnitDefinition;
}

export interface RecipeItemCost extends RecipeCostItem {
  readonly extendedCost: Decimal;
}

export type RecipeCategoryTotals = Readonly<
  Record<RecipeCostCategory, Decimal>
>;

export interface RecipeCostResult {
  readonly items: readonly RecipeItemCost[];
  readonly categoryTotals: RecipeCategoryTotals;
  readonly totalRecipeCost: Decimal;
  readonly batchCost: Decimal;
  readonly theoreticalOutputQuantity: Decimal;
  readonly actualOutputQuantity: Decimal;
  readonly estimatedLossQuantity: Decimal | null;
  readonly actualLossQuantity: Decimal | null;
  readonly theoreticalYieldRate: Decimal | null;
  readonly actualYieldRate: Decimal | null;
  readonly unitCost: Decimal;
  readonly portionCost: Decimal | null;
  readonly costPerKilogram: Decimal | null;
  readonly costPerLiter: Decimal | null;
}

export interface ScaleRecipeInput {
  readonly baseBatchQuantity: DecimalInput;
  readonly targetBatchQuantity: DecimalInput;
  readonly items: readonly Pick<RecipeCostItem, "id" | "quantity">[];
}

export interface ScaledRecipe {
  readonly scaleFactor: Decimal;
  readonly items: readonly { id: string; quantity: Decimal }[];
}

export interface RecipeDependency {
  readonly recipeId: string;
  readonly subRecipeIds: readonly string[];
}

const CATEGORIES: readonly RecipeCostCategory[] = [
  "ingredient",
  "sub_recipe",
  "packaging",
  "direct_labor",
  "direct_variable",
  "allocated_indirect",
];

export function calculateRecipeCost(input: RecipeCostInput): RecipeCostResult {
  const seen = new Set<string>();
  const items = input.items.map((item, index): RecipeItemCost => {
    if (!item.id.trim()) {
      throw new CalculationError(
        "INVALID_QUANTITY",
        `items[${index}].id cannot be empty.`,
      );
    }
    if (seen.has(item.id)) {
      throw new CalculationError(
        "INVALID_QUANTITY",
        `Duplicate recipe cost item: ${item.id}.`,
      );
    }
    seen.add(item.id);
    const quantity = nonNegative(
      item.quantity,
      `items[${index}].quantity`,
      "INVALID_QUANTITY",
    );
    const costPerUnit = nonNegative(
      item.costPerUnit,
      `items[${index}].costPerUnit`,
    );
    return {
      ...item,
      quantity,
      costPerUnit,
      extendedCost: quantity.times(costPerUnit),
    };
  });

  const categoryTotals = Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      sum(
        items
          .filter((item) => item.category === category)
          .map((item) => item.extendedCost),
      ),
    ]),
  ) as unknown as RecipeCategoryTotals;
  const totalRecipeCost = sum(Object.values(categoryTotals));
  const theoreticalOutputQuantity = positive(
    input.theoreticalOutputQuantity,
    "theoreticalOutputQuantity",
  );
  const actualOutputQuantity = positive(
    input.actualOutputQuantity ?? theoreticalOutputQuantity,
    "actualOutputQuantity",
  );
  const grossOutputQuantity =
    input.grossOutputQuantity === undefined
      ? null
      : positive(input.grossOutputQuantity, "grossOutputQuantity");
  if (
    grossOutputQuantity !== null &&
    (theoreticalOutputQuantity.gt(grossOutputQuantity) ||
      actualOutputQuantity.gt(grossOutputQuantity))
  ) {
    throw new CalculationError(
      "INVALID_YIELD",
      "Usable output cannot be greater than gross output.",
    );
  }

  const portions =
    input.portions === undefined
      ? null
      : positive(input.portions, "portions", "INVALID_QUANTITY");
  const outputMetrics = calculateOutputMetrics(
    totalRecipeCost,
    actualOutputQuantity,
    input.outputUnit,
  );

  return {
    items,
    categoryTotals,
    totalRecipeCost,
    batchCost: totalRecipeCost,
    theoreticalOutputQuantity,
    actualOutputQuantity,
    estimatedLossQuantity:
      grossOutputQuantity?.minus(theoreticalOutputQuantity) ?? null,
    actualLossQuantity:
      grossOutputQuantity?.minus(actualOutputQuantity) ?? null,
    theoreticalYieldRate:
      grossOutputQuantity === null
        ? null
        : theoreticalOutputQuantity.div(grossOutputQuantity),
    actualYieldRate:
      grossOutputQuantity === null
        ? null
        : actualOutputQuantity.div(grossOutputQuantity),
    unitCost: totalRecipeCost.div(actualOutputQuantity),
    portionCost: portions === null ? null : totalRecipeCost.div(portions),
    ...outputMetrics,
  };
}

export function scaleRecipe(input: ScaleRecipeInput): ScaledRecipe {
  const base = positive(input.baseBatchQuantity, "baseBatchQuantity");
  const target = positive(input.targetBatchQuantity, "targetBatchQuantity");
  const scaleFactor = target.div(base);
  return {
    scaleFactor,
    items: input.items.map((item, index) => ({
      id: item.id,
      quantity: nonNegative(
        item.quantity,
        `items[${index}].quantity`,
        "INVALID_QUANTITY",
      ).times(scaleFactor),
    })),
  };
}

/** Throws with the complete cycle path if a recipe dependency graph is circular. */
export function assertAcyclicRecipes(
  dependencies: readonly RecipeDependency[],
): void {
  const graph = new Map<string, readonly string[]>();
  for (const dependency of dependencies) {
    if (graph.has(dependency.recipeId)) {
      throw new CalculationError(
        "DUPLICATE_RECIPE",
        `Duplicate recipe dependency declaration: ${dependency.recipeId}.`,
      );
    }
    graph.set(dependency.recipeId, dependency.subRecipeIds);
  }

  const completed = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];
  const visit = (recipeId: string): void => {
    if (completed.has(recipeId)) return;
    if (visiting.has(recipeId)) {
      const start = path.indexOf(recipeId);
      const cycle = [...path.slice(start), recipeId];
      throw new CalculationError(
        "CIRCULAR_RECIPE",
        `Circular recipe: ${cycle.join(" -> ")}`,
        {
          path: cycle.join(" -> "),
        },
      );
    }
    visiting.add(recipeId);
    path.push(recipeId);
    for (const subRecipeId of graph.get(recipeId) ?? []) visit(subRecipeId);
    path.pop();
    visiting.delete(recipeId);
    completed.add(recipeId);
  };

  for (const recipeId of graph.keys()) visit(recipeId);
}

function calculateOutputMetrics(
  totalCost: Decimal,
  actualOutput: Decimal,
  unit?: UnitDefinition,
): Pick<RecipeCostResult, "costPerKilogram" | "costPerLiter"> {
  if (unit?.dimension === "mass") {
    const kilograms = convertQuantity(actualOutput, unit, {
      code: "kg",
      dimension: "mass",
      toBaseFactor: 1000,
    });
    return { costPerKilogram: totalCost.div(kilograms), costPerLiter: null };
  }
  if (unit?.dimension === "volume") {
    const liters = convertQuantity(actualOutput, unit, {
      code: "l",
      dimension: "volume",
      toBaseFactor: 1000,
    });
    return { costPerKilogram: null, costPerLiter: totalCost.div(liters) };
  }
  return { costPerKilogram: null, costPerLiter: null };
}
