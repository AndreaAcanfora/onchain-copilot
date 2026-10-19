const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usdSmall = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 2 });

export function formatUsd(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.01) return usdSmall.format(value);
  return usd.format(value);
}

/**
 * Token amount: up to `digits` decimals at or above 1, four significant digits below,
 * so fees and dust stay readable instead of collapsing to "0.0001". Trailing zeros dropped.
 */
export function formatToken(value: number, symbol: string, digits = 4): string {
  const options: Intl.NumberFormatOptions =
    Math.abs(value) >= 1 ? { maximumFractionDigits: digits } : { maximumSignificantDigits: 4 };
  return `${value.toLocaleString("en-US", options)} ${symbol}`;
}
