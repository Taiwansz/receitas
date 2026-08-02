import { describe, expect, it } from "vitest";

import { UNITS } from "./conversions";
import {
  assertAcyclicRecipes,
  calculateRecipeCost,
  scaleRecipe,
} from "./recipe";

describe("recipe costing", () => {
  it("combines ingredients, sub-recipes, packaging, labor and allocated costs", () => {
    const result = calculateRecipeCost({
      items: [
        { id: "flour", category: "ingredient", quantity: 2, costPerUnit: 5 },
        { id: "sauce", category: "sub_recipe", quantity: 1, costPerUnit: 8 },
        { id: "box", category: "packaging", quantity: 10, costPerUnit: "0.5" },
        { id: "cook", category: "direct_labor", quantity: 2, costPerUnit: 10 },
        { id: "gas", category: "direct_variable", quantity: 1, costPerUnit: 2 },
        {
          id: "rent",
          category: "allocated_indirect",
          quantity: 1,
          costPerUnit: 5,
        },
      ],
      grossOutputQuantity: 12,
      theoreticalOutputQuantity: 10,
      actualOutputQuantity: 8,
      portions: 8,
      outputUnit: UNITS.kilogram,
    });

    expect(result.totalRecipeCost.toString()).toBe("50");
    expect(result.categoryTotals.ingredient.toString()).toBe("10");
    expect(result.categoryTotals.sub_recipe.toString()).toBe("8");
    expect(result.estimatedLossQuantity?.toString()).toBe("2");
    expect(result.actualLossQuantity?.toString()).toBe("4");
    expect(result.portionCost?.toString()).toBe("6.25");
    expect(result.costPerKilogram?.toString()).toBe("6.25");
    expect(
      result.theoreticalYieldRate?.toSignificantDigits(20).toString(),
    ).toBe("0.83333333333333333333");
  });

  it("calculates cost per liter from a milliliter output", () => {
    const result = calculateRecipeCost({
      items: [
        { id: "liquid", category: "ingredient", quantity: 1, costPerUnit: 9 },
      ],
      theoreticalOutputQuantity: 1500,
      outputUnit: UNITS.milliliter,
    });
    expect(result.costPerLiter?.toString()).toBe("6");
  });

  it("scales all quantities by the same production factor", () => {
    const result = scaleRecipe({
      baseBatchQuantity: 10,
      targetBatchQuantity: 25,
      items: [
        { id: "a", quantity: 2 },
        { id: "b", quantity: "0.5" },
      ],
    });
    expect(result.scaleFactor.toString()).toBe("2.5");
    expect(result.items.map((item) => item.quantity.toString())).toEqual([
      "5",
      "1.25",
    ]);
  });

  it("detects direct and indirect circular sub-recipes", () => {
    expect(() =>
      assertAcyclicRecipes([
        { recipeId: "A", subRecipeIds: ["B"] },
        { recipeId: "B", subRecipeIds: ["C"] },
        { recipeId: "C", subRecipeIds: ["A"] },
      ]),
    ).toThrow(/A -> B -> C -> A/);
    expect(() =>
      assertAcyclicRecipes([{ recipeId: "A", subRecipeIds: ["A"] }]),
    ).toThrow(/A -> A/);
  });

  it("rejects impossible actual yield", () => {
    expect(() =>
      calculateRecipeCost({
        items: [],
        grossOutputQuantity: 10,
        theoreticalOutputQuantity: 11,
      }),
    ).toThrow(/greater than gross/);
  });
});
