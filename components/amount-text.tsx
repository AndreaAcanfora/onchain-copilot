import type { Amount } from "@/lib/chain/facts";
import { formatToken, formatUsd } from "@/lib/format";

export function AmountText({ amount, signed = false }: { amount: Amount; signed?: boolean }) {
  const sign = signed && amount.value > 0 ? "+" : "";
  const negative = amount.value < 0;
  return (
    <span className="font-mono">
      {sign}
      {negative ? "−" : ""}
      {formatToken(Math.abs(amount.value), amount.symbol)}
      {amount.usd !== null && amount.value !== 0 && (
        <span className="ml-2 text-ink-faint">{formatUsd(Math.abs(amount.usd))}</span>
      )}
    </span>
  );
}
