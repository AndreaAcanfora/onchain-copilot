const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usdSmall = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 2 });

export function formatUsd(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.01) return usdSmall.format(value);
  return usd.format(value);
}

/** Token amount with up to `digits` decimals, trailing zeros dropped; tiny non-zero values never round to "0". */
export function formatToken(value: number, symbol: string, digits = 4): string {
  const min = 10 ** -digits;
  if (value !== 0 && Math.abs(value) < min) return `<${min.toFixed(digits)} ${symbol}`;
  const text = value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return `${text} ${symbol}`;
}
