import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { roundDecimal } from "./decimal";

describe("roundDecimal", () => {
  it("uses the documented 40-significant-digit calculation policy", () => {
    expect(Decimal.precision).toBe(40);
    expect(new Decimal(1).div(3).toString()).toBe(
      "0.3333333333333333333333333333333333333333",
    );
  });

  it("uses half-up only when the caller explicitly requests rounding", () => {
    expect(roundDecimal("1.005", 2).toString()).toBe("1.01");
    expect(roundDecimal("1.005", 2, Decimal.ROUND_DOWN).toString()).toBe("1");
  });
});
