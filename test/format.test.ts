import { describe, expect, it } from "vitest";
import { formatToken, formatUsd } from "../lib/format";

describe("formatUsd", () => {
  it("formats dollars with two decimals", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });

  it("keeps two significant digits below one cent", () => {
    expect(formatUsd(0.00123)).toBe("$0.0012");
  });

  it("formats zero as $0.00", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("formatToken", () => {
  it("drops trailing zeros", () => {
    expect(formatToken(2, "ETH")).toBe("2 ETH");
  });

  it("caps decimals", () => {
    expect(formatToken(6140.123456, "USDC")).toBe("6,140.1235 USDC");
  });

  it("keeps four significant digits below one, so a fee never rounds to zero", () => {
    expect(formatToken(0.000016466419569136, "ETH")).toBe("0.00001647 ETH");
    expect(formatToken(0.02301098, "ETH")).toBe("0.02301 ETH");
  });

  it("formats zero plainly", () => {
    expect(formatToken(0, "ETH")).toBe("0 ETH");
  });
});
