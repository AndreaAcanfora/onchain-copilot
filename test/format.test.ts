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

  it("never rounds a tiny non-zero amount to zero", () => {
    expect(formatToken(0.0000001, "ETH")).toBe("<0.0001 ETH");
  });
});
